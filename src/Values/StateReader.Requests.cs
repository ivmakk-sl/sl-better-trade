using System;
using System.Collections.Generic;
using GameCore.HotUpdate;
using GameCore.HotUpdate.Battle.Logic;
using GameCore.HotUpdate.ReduxUI;

namespace BetterTrade
{
    // The reads of Deliver Request from the game's own data: the drop check of the drone (CollectDispatchTake), the
    // item of each request demand, and the delivery request reward of each row of the delivery request list.
    internal static partial class StateReader
    {
        // A failed call of the game's drop check: the cells of Deliver Request show no number and no dim, and the log has
        // one warning for the game session.
        private static bool dispatchWarned;

        // The number, the dim, and the request demands of each cell. A storage cell with a hint of the
        // selected delivery request gets one take of the drone cargo plus the cell; a storage cell with no hint is
        // dimmed with no take, because the game refuses it before any rule; a drone cell gets one take of the drone
        // cargo without it.
        private static void DispatchCells(State_Web_TradeUI s, Reducer_Web_TradeUI.DispTarget target, List<Data_Item> items, PageJson.Data data, List<string> log)
        {
            var names = new List<string>();
            var hinted = new HashSet<long>();
            if (target?.demands != null)
                for (int i = 0; i < target.demands.Count; i++) names.Add(target.demands[i]?.text ?? "");
            if (target?.hints != null)
                for (int i = 0; i < target.hints.Count; i++)
                    if (target.hints[i] != null) hinted.Add(target.hints[i].id);

            var cells = new List<PageJson.Cell>();
            try
            {
                var give = Reducer_Web_TradeUI.ParseGive(s.GiveJson) ?? new Il2CppSystem.Collections.Generic.List<State_Web_TradeUI.GiveEntry>();
                var baseTake = Reducer_Web_TradeUI.CollectDispatchTake(s, give);
                int[] baseAdd = CopyAdd(baseTake);
                var giveIds = new HashSet<long>();
                for (int i = 0; i < give.Count; i++)
                    if (give[i] != null) giveIds.Add(give[i].id);

                foreach (var item in items)
                {
                    long id = item.LogicId;
                    DispatchCount.Result r;
                    if (giveIds.Contains(id))
                    {
                        var without = new Il2CppSystem.Collections.Generic.List<State_Web_TradeUI.GiveEntry>();
                        for (int i = 0; i < give.Count; i++)
                            if (give[i] != null && give[i].id != id) without.Add(give[i]);
                        r = DispatchCount.Of(CopyAdd(Reducer_Web_TradeUI.CollectDispatchTake(s, without)), baseAdd, Accepts(baseTake, id));
                    }
                    else if (hinted.Contains(id))
                    {
                        var with = new Il2CppSystem.Collections.Generic.List<State_Web_TradeUI.GiveEntry>();
                        for (int i = 0; i < give.Count; i++) with.Add(give[i]);
                        with.Add(new State_Web_TradeUI.GiveEntry { id = id });
                        var take = Reducer_Web_TradeUI.CollectDispatchTake(s, with);
                        r = DispatchCount.Of(baseAdd, CopyAdd(take), Accepts(take, id));
                    }
                    else r = DispatchCount.Of(baseAdd, null, false);

                    var cell = new PageJson.Cell { Id = id, Number = r.Number, Dim = r.Dim, InfoKey = InfoKey(item) };
                    foreach (var p in r.Parts)
                        cell.Demands.Add(new PageJson.CellDemand { Name = p.Demand < names.Count ? names[p.Demand] : "", Add = p.Add });
                    cells.Add(cell);
                    log?.Add(r.Dim ? $"{id}:dim" : $"{id}:+{r.Number}@{cell.Demands[0].Name}");
                }
            }
            catch (Exception e)
            {
                if (!dispatchWarned)
                {
                    dispatchWarned = true;
                    Plugin.Log.LogWarning($"Better Trade: the drop check of the drone failed, Deliver Request shows no numbers: {e.GetType().Name}: {e.Message}");
                }
                cells.Clear();
                foreach (var item in items) cells.Add(new PageJson.Cell { Id = item.LogicId, InfoKey = InfoKey(item) });
                log?.Add("failed");
            }
            data.Items.AddRange(cells);
        }

        private static int[] CopyAdd(Reducer_Web_TradeUI.DispatchTake take)
        {
            var a = take?.Add;
            if (a == null) return null;
            var result = new int[a.Length];
            for (int i = 0; i < a.Length; i++) result[i] = a[i];
            return result;
        }

        private static bool Accepts(Reducer_Web_TradeUI.DispatchTake take, long id) => take?.Accepted != null && take.Accepted.Contains(id);

        // The request demands of each row of the delivery request list, for the bars, with the item of each
        // request demand for one item. A row of kind 2 (the race of the rescue camp) has rows for the two
        // sides, not request demands, so it gets none.
        private static void AddRequests(Reducer_Web_TradeUI.DispPayload payload, PageJson.Data data)
        {
            var targets = payload?.targets;
            if (targets == null || !data.Bars) return;
            var log = Plugin.Verbose.Value ? new List<string>() : null;
            for (int t = 0; t < targets.Count; t++)
            {
                var target = targets[t];
                var demands = target?.demands;
                if (target == null || target.kind == 2 || demands == null) continue;
                var list = new List<RequestData.Demand>();
                var kinds = new int[demands.Count];
                for (int i = 0; i < demands.Count; i++)
                {
                    var d = demands[i];
                    list.Add(new RequestData.Demand { Need = d?.need ?? 0, Paid = d?.paid ?? 0, Done = d != null && d.done });
                    kinds[i] = d?.kind ?? -1;
                }
                var views = RequestData.Demands(list);
                var ids = RequestData.ItemIds(target.kind, target.id, kinds, RowLines(target));
                for (int i = 0; i < views.Count; i++)
                    if (ids[i] > 0 && AddObject(data, ids[i], views[i].Need)) views[i].Item = ids[i];
                    else ids[i] = 0;
                string key = target.kind + "_" + target.id;
                data.Requests.Add(new KeyValuePair<string, List<RequestData.DemandView>>(key, views));
                log?.Add(key + ": " + string.Join(",", Array.ConvertAll(ids, id => id > 0 ? id.ToString() : "-")));
            }
            if (log != null) Plugin.Log.LogDebug("Better Trade request demand items: " + string.Join(" | ", log));
        }

        // The config ids in PageJson.Data.Objects of the refresh that runs now; Read clears it.
        private static readonly HashSet<int> objectIds = new HashSet<int>();

        // Adds the item object of a config id to the page data once: the object that the game builds for an
        // offered row, so the page's own tooltip shows it. False when the game has no such item or the call fails.
        private static bool AddObject(PageJson.Data data, int configId, int count)
        {
            if (objectIds.Contains(configId)) return true;
            try
            {
                var cfg = ConfigManager.Instance.Get_Config_Item(configId);
                if (cfg == null) return false;
                var sb = new Il2CppSystem.Text.StringBuilder();
                bool first = true;
                Reducer_Web_TradeUI.AppendShelfJson(sb, ref first, configId, cfg, count, 0, false);
                string json = sb.ToString();
                if (string.IsNullOrEmpty(json) || json[0] != '{') return false;
                data.Objects.Add(new KeyValuePair<int, string>(configId, json));
                objectIds.Add(configId);
                return true;
            }
            catch (Exception e)
            {
                if (warned.Add("object " + e.Message)) Plugin.Log.LogWarning($"Better Trade: no item object for {configId}: {e.GetType().Name}: {e.Message}");
                return false;
            }
        }

        // The lines of the game data of a row: the AidDemandSave list of an aid platform delivery request,
        // or the DemandLine list of a radio aid delivery request. Null for each other row, and for a failed read.
        private static List<RequestData.Line> RowLines(Reducer_Web_TradeUI.DispTarget target)
        {
            try
            {
                var result = new List<RequestData.Line>();
                var source = RequestData.SourceOf(target.kind, target.id);
                if (source == RequestData.RowSource.AidPlatform)
                {
                    var lines = BattleLogicWorld.Instance?._AidPlatformManager?.FindRequest(target.id)?.Demands;
                    if (lines == null) return null;
                    for (int i = 0; i < lines.Count; i++)
                        result.Add(lines[i] == null ? null : new RequestData.Line { Kind = lines[i].Kind, ItemId = lines[i].ItemId });
                    return result;
                }
                if (source == RequestData.RowSource.AidChannel)
                {
                    var support = BattleLogicWorld.Instance?._StrangerSupportManager;
                    var lines = support == null ? null : StrangerSupportManager.GetPoolSpec(support.AidChannelPool, RequestData.ChannelOf(target.id))?.Lines;
                    if (lines == null) return null;
                    for (int i = 0; i < lines.Count; i++)
                    {
                        var l = lines[i];
                        if (l == null) { result.Add(null); continue; }
                        var picks = new List<int>();
                        if (l.PickIds != null)
                        {
                            var e = l.PickIds.GetEnumerator();
                            while (e.MoveNext()) picks.Add(e.Current);
                        }
                        result.Add(new RequestData.Line { Kind = (int)l.Kind, ItemId = l.ItemId, PickIds = picks.ToArray() });
                    }
                    return result;
                }
                return null;
            }
            catch (Exception e)
            {
                if (warned.Add("lines " + e.Message)) Plugin.Log.LogWarning($"Better Trade: no items of the request demands of {target.kind}_{target.id}: {e.GetType().Name}: {e.Message}");
                return null;
            }
        }

        // The delivery request reward of each row of the delivery request list, with the item object of each
        // reward item. Only with the config entry DeliveryRequestRewards on: with it off, the mod reads no reward. A
        // failed read gives no reward for that row and one Verbose line.
        private static void AddRewards(Reducer_Web_TradeUI.DispPayload payload, PageJson.Data data)
        {
            var targets = payload?.targets;
            if (targets == null || !Plugin.DeliveryRequestRewards.Value) return;
            var log = Plugin.Verbose.Value ? new List<string>() : null;
            for (int t = 0; t < targets.Count; t++)
            {
                var target = targets[t];
                if (target == null) continue;
                var lookup = RewardData.SourceOf(target.kind, target.id, target.no);
                if (lookup.Source == RewardData.Source.None) continue;
                string key = target.kind + "_" + target.id;
                List<RewardData.Item> items;
                try
                {
                    var reward = lookup.Source == RewardData.Source.AidPlatform
                        ? AidPlatformManager.BuildCommissionReward(lookup.Key)
                        : StrangerSupportManager.GetDefRsGift(StrangerSupportManager.AidChannelDefRs(lookup.Key));
                    items = RewardData.Items(Pairs(reward));
                }
                catch (Exception e)
                {
                    log?.Add(key + ": failed " + e.GetType().Name + ": " + e.Message);
                    continue;
                }
                items.RemoveAll(i => !AddObject(data, i.Id, i.Count));
                if (items.Count == 0) continue;
                data.Rewards.Add(new KeyValuePair<string, List<RewardData.Item>>(key, items));
                log?.Add(key + ": " + string.Join(", ", items.ConvertAll(i => i.Id + "x" + i.Count)));
            }
            if (log != null) Plugin.Log.LogDebug("Better Trade delivery request rewards: " + string.Join(" | ", log));
        }

        private static List<KeyValuePair<int, int>> Pairs(Il2CppSystem.Collections.Generic.Dictionary<int, int> d)
        {
            var result = new List<KeyValuePair<int, int>>();
            if (d == null) return result;
            var e = d.GetEnumerator();
            while (e.MoveNext()) result.Add(new KeyValuePair<int, int>(e.Current.Key, e.Current.Value));
            return result;
        }
    }
}
