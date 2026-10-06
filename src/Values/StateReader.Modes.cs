using System.Collections.Generic;
using GameCore.HotUpdate;
using GameCore.HotUpdate.ReduxUI;

namespace BetterTrade
{
    // The readers of the satiety modes: Deliver Supplies (a neighbor or a camp), the donation, and Deliver Request with
    // the request demands of each row of its delivery request list.
    internal static partial class StateReader
    {
        private static readonly string[] KindNames = { "sat", "seed", "mat", "med", "fuel", "" };

        private static PageJson.Cell SupplyCell(Data_Item item, TradeMath.SupplyResult r) => new PageJson.Cell
        {
            Id = item.LogicId,
            Number = r.Amount,
            Kind = KindNames[(int)r.Kind],
            Dim = r.Kind == TradeMath.SupplyKind.None,
            Order = TradeMath.SupplyOrder(r.Kind),
            InfoKey = InfoKey(item),
        };

        private static PageJson.Cell NumberCell(Data_Item item, int number) => new PageJson.Cell
        {
            Id = item.LogicId,
            Number = number,
            Dim = number <= 0,
            InfoKey = InfoKey(item),
        };

        // Deliver Supplies: a camp row of the supply targets is a camp, else the target is a neighbor.
        private static void Supply(State_Web_TradeUI s, ConfigManager config, List<Data_Item> items, PageJson.Data data)
        {
            var rows = Reducer_Web_TradeUI.ParseSupplyTargets(s.SupplyTargetsRaw);
            bool camp = rows != null && Reducer_Web_TradeUI.FindCampRow(rows, s.NpcId) != null;
            data.Mode = camp ? "camp" : "supply";
            var giveIds = GiveIds(s);
            int medicine = 0;
            var log = Plugin.Verbose.Value ? new List<string>() : null;
            foreach (var item in items)
            {
                var cfg = config.Get_Config_Item(item.ItemConfigId);
                if (cfg == null) continue;
                float uses = TradeMath.EffectiveUses(item.UseTimes, item.MaxUseTimes, cfg.UseTimes);
                int value = GameCore.HotUpdate.StrangerTrade.SupplyLevelRules.ConvertItem(item.ItemConfigId, item.ItemCount, uses, out var dim);
                var r = camp
                    ? TradeMath.CampGain(cfg.Category, cfg.BurnValue, (int)dim, value, item.ItemCount)
                    : TradeMath.SupplyAmount((int)dim, value);
                data.Items.Add(SupplyCell(item, r));
                if (!camp && r.Kind == TradeMath.SupplyKind.Medicine && giveIds.Contains(item.LogicId)) medicine += r.Amount;
                if (log != null)
                {
                    string check;
                    if (camp)
                    {
                        int game = Reducer_Web_TradeUI.CampGainOf(item, cfg, out int gameKind);
                        check = $"game={game}/{gameKind}";
                    }
                    else check = $"usesGame={Reducer_Web_TradeUI.EffectiveUses(item, cfg):0.##}/mod={uses:0.##}";
                    log.Add($"{item.LogicId}:{KindNames[(int)r.Kind]}{r.Amount}({check})");
                }
            }
            if (!camp && medicine > 0) data.Medicine = medicine;
            if (log != null) Plugin.Log.LogDebug($"Better Trade refresh: mode={data.Mode} target={s.NpcId} items {string.Join(" ", log)}");
        }

        // The donation (Aid the Warehouse Keeper, the Trapped Veteran): the satiety of each stack.
        private static void Donate(State_Web_TradeUI s, ConfigManager config, List<Data_Item> items, PageJson.Data data)
        {
            data.Mode = "donate";
            var log = Plugin.Verbose.Value ? new List<string>() : null;
            foreach (var item in items)
            {
                var cfg = config.Get_Config_Item(item.ItemConfigId);
                if (cfg == null) continue;
                var vd = item.InstanceVD;
                float? own = vd != null && vd.Length > 0 ? vd[0] : (float?)null;
                float satiety = TradeMath.DonateSatiety(item.UseTimes, item.MaxUseTimes, cfg.UseTimes, own, cfg.ValueDisplay1, item.ItemCount);
                data.Items.Add(NumberCell(item, TradeMath.Shown(satiety)));
                log?.Add($"{item.LogicId}:{satiety:0.##}(game={Reducer_Web_TradeUI.DonateSatietyOf(item, cfg):0.##})");
            }
            if (log != null) Plugin.Log.LogDebug($"Better Trade refresh: mode=donate target={s.DonateTarget} items {string.Join(" ", log)}");
        }

        // Deliver Request: what each stack adds to the request demands of the selected delivery request, from the game's
        // own drop check.
        private static void Dispatch(State_Web_TradeUI s, ConfigManager config, List<Data_Item> items, PageJson.Data data)
        {
            data.Mode = "request";
            data.Bars = Plugin.DeliveryRequestList.Value;
            var watch = System.Diagnostics.Stopwatch.StartNew();
            var payload = Reducer_Web_TradeUI.ParseDispatch(s.DispatchRaw);
            var target = payload == null ? null : Reducer_Web_TradeUI.FindDispTarget(payload, s.DispSelKind, s.DispSelId);
            var log = Plugin.Verbose.Value ? new List<string>() : null;
            DispatchCells(s, target, items, data, log);
            AddRequests(payload, data);
            AddRewards(payload, data);
            if (log != null) Plugin.Log.LogDebug($"Better Trade refresh: mode=request target={s.DispSelKind}/{s.DispSelId} kind={target?.kind ?? 0} items {string.Join(" ", log)} requests {data.Requests.Count} in {watch.Elapsed.TotalMilliseconds:0.00} ms");
        }

        private static HashSet<long> GiveIds(State_Web_TradeUI s)
        {
            var ids = new HashSet<long>();
            var give = Reducer_Web_TradeUI.ParseGive(s.GiveJson);
            if (give != null)
                for (int i = 0; i < give.Count; i++)
                    if (give[i] != null) ids.Add(give[i].id);
            return ids;
        }
    }
}
