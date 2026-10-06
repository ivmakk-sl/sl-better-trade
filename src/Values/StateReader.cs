using System;
using System.Collections.Generic;
using GameCore.HotUpdate;
using GameCore.HotUpdate.ReduxUI;

namespace BetterTrade
{
    // Reads the trade window state into plain records, and builds the data JSON of the page script with the game-free
    // TradeMath and TradeData. Runs at the frame tick after a refresh of the window (PageTick).
    internal static partial class StateReader
    {
        private static readonly HashSet<string> warned = new HashSet<string>();
        // The window (by its owner id) whose bar self-check failed: it shows no bar numbers until it closes.
        private static long checkFailedOwner;

        public static string Json(State_Web_TradeUI state) => PageJson.DataJson(Read(state));

        // A new open of the trade window: a failed self-check of the last window no longer hides the bar. Read never
        // sees a closed window (the tick does not read the state then), so the reset comes from the page ready call.
        public static void WindowOpened() => checkFailedOwner = 0;

        private static PageJson.Data Read(State_Web_TradeUI s)
        {
            var data = new PageJson.Data { Mode = "none" };
            objectIds.Clear();
            if (s == null || s.OwnerId == 0) return data;
            // The roster phase of Respond to Request: no neighbor is picked yet.
            if (s.Phase?.Value == "roster") return data;
            foreach (var w in ModTexts.Current().ToDictionary()) data.Words.Add(w);

            var config = ConfigManager.Instance;
            var items = OwnItems(s);
            if (s.IsWhDonate) Donate(s, config, items, data);
            else if (s.IsSupply) Supply(s, config, items, data);
            else if (s.IsDispatch) Dispatch(s, config, items, data);
            else Trade(s, config, items, data);
            AddSortKeys(config, items, data);
            AddInfo(config, items, data);
            return data;
        }

        // The config id and the expiry moment of each cell, for the value order.
        private static void AddSortKeys(ConfigManager config, List<Data_Item> items, PageJson.Data data)
        {
            var byId = new Dictionary<long, Data_Item>();
            foreach (var item in items) byId[item.LogicId] = item;
            var log = Plugin.Verbose.Value ? new List<string>() : null;
            foreach (var cell in data.Items)
            {
                if (!byId.TryGetValue(cell.Id, out var item)) continue;
                cell.Cid = item.ItemConfigId;
                var cfg = config.Get_Config_Item(item.ItemConfigId);
                cell.Exp = cfg == null ? 0 : TradeData.ExpiryOf(cfg.Life, item.StartTime, item.TimeLeft);
                if (log != null && cell.Exp > 0) log.Add($"{cell.Id}:{cell.Cid}@{cell.Exp}");
            }
            if (log != null && log.Count > 0) Plugin.Log.LogDebug($"Better Trade expiry: {string.Join(" ", log)}");
        }

        // The items of the open tab of the storage grid, then the items in the drone, each once.
        private static List<Data_Item> OwnItems(State_Web_TradeUI s)
        {
            var result = new List<Data_Item>();
            var seen = new HashSet<long>();
            var list = s.ItemDataList;
            if (list != null)
                for (int i = 0; i < list.Count; i++)
                {
                    var item = list[i];
                    if (item != null && item.ItemConfigId != 0 && seen.Add(item.LogicId)) result.Add(item);
                }
            var give = Reducer_Web_TradeUI.ParseGive(s.GiveJson);
            if (give != null)
                for (int i = 0; i < give.Count; i++)
                {
                    var entry = give[i];
                    if (entry == null || seen.Contains(entry.id)) continue;
                    var item = Reducer_Web_TradeUI.FindBagItem(s, entry.id);
                    if (item != null && item.ItemConfigId != 0 && seen.Add(item.LogicId)) result.Add(item);
                }
            return result;
        }

        private static void Trade(State_Web_TradeUI s, ConfigManager config, List<Data_Item> items, PageJson.Data data)
        {
            data.Mode = "trade";
            var settings = Settings(config);
            bool tradeRunPoint = s.NpcId < 1 && s.ShelfShopId > 0;
            var trader = new TradeMath.Trader
            {
                DemandCategory = s.DemandCategory,
                DemandCategoryMask = s.DemandCategoryMask,
                Boost = s.Boost,
                BoostMax = s.BoostMax,
                AppraisalBoost = s.AppraisalBoost,
                HalfValueCategory = s.HalfValueCategory,
                AidDemandCategory = s.AidDemandCategory,
                HalfRate = settings.HalfRate,
                IsTradeRunPoint = tradeRunPoint,
                IsCampPoint = tradeRunPoint && s.CampState != 0,
            };

            // The give lines: the items in the drone.
            var giveIds = GiveIds(s);
            var giveValues = new List<float>();

            foreach (var item in items)
            {
                var cfg = config.Get_Config_Item(item.ItemConfigId);
                if (cfg == null) continue;
                var line = new TradeMath.GiveLine
                {
                    Category = cfg.Category,
                    TradeValue = cfg.TradeValue,
                    Count = item.ItemCount,
                    UseTimes = item.UseTimes,
                    MaxUseTimes = item.MaxUseTimes,
                    CfgUses = cfg.UseTimes,
                    CfgSellRate = cfg.TradeSellRate,
                };
                var cell = TradeData.TradeCell(item.LogicId, line, trader);
                cell.InfoKey = InfoKey(item);
                data.Items.Add(cell);
                if (giveIds.Contains(item.LogicId)) giveValues.Add(TradeMath.GiveValue(line, trader).Value);
            }

            // The take lines (the picked goods) and the value of one unit of each offered row.
            float medicineRate = GameKey.EndlessTradeTakeMedicineRate;
            var takeLines = new List<int>();
            var picks = Reducer_Web_TradeUI.ParsePicks(s.PicksJson);
            bool picked = false;
            if (picks != null)
            {
                var e = picks.GetEnumerator();
                while (e.MoveNext())
                {
                    int count = e.Current.Value;
                    if (count < 1) continue;
                    var cfg = config.Get_Config_Item(e.Current.Key);
                    if (cfg == null) continue;
                    takeLines.Add(count * TradeMath.TakeUnitValue(cfg.TradeValue, cfg.UseTimes, cfg.Category == 2, trader.IsCampPoint, medicineRate));
                    picked = true;
                }
            }
            var shelf = Reducer_Web_TradeUI.ParsePicks(s.ShelfSnapshotJson);
            var shelfIds = new List<int>();
            if (shelf != null)
            {
                var e = shelf.GetEnumerator();
                while (e.MoveNext())
                {
                    var cfg = config.Get_Config_Item(e.Current.Key);
                    if (cfg == null) continue;
                    data.Shelf.Add(new KeyValuePair<int, int>(e.Current.Key, TradeMath.TakeUnitValue(cfg.TradeValue, cfg.UseTimes, cfg.Category == 2, trader.IsCampPoint, medicineRate)));
                    shelfIds.Add(e.Current.Key);
                }
            }
            foreach (int id in shelfIds)
                data.Info.Add(ConfigInfo(config, config.Get_Config_Item(id), id.ToString()));

            var totals = TradeMath.Totals(giveValues, takeLines, s.DealLineBonus, settings);
            float gameBarNet = s.BarNet?.Value ?? 0f;
            bool ok = TradeData.SelfCheck(totals, gameBarNet, settings.BarScale);
            if (!ok && checkFailedOwner != s.OwnerId)
            {
                checkFailedOwner = s.OwnerId;
                Plugin.Log.LogWarning($"Better Trade self-check failed: offer - goods = {totals.Offer - totals.Goods:0.##}, the game's BarNet x bar scale = {gameBarNet * settings.BarScale:0.##}. The bar numbers are off for this window.");
            }
            if (checkFailedOwner != s.OwnerId) data.Bar = TradeData.BarOf(totals, picked);

            var (wants, half) = TradeData.Header(trader, c => Reducer_Web_TradeUI.CategoryDisplayName(c) ?? "");
            data.Wants = wants;
            data.Half = half;

            if (Plugin.Verbose.Value)
                Plugin.Log.LogDebug($"Better Trade refresh: mode=trade items={data.Items.Count} give={giveValues.Count} offer={totals.Offer:0.##} goods={totals.Goods} dealLine={totals.DealLine:0.##} check={(ok ? "ok" : "fail")} barNet={gameBarNet:0.####}");
        }

        // The settings of Config_GlobalSetting that the trade reads, with the game's fallbacks.
        private static TradeMath.Settings Settings(ConfigManager config)
        {
            float? Param(string key)
            {
                try { return config.TryGet_Config_GlobalSetting(key)?.Params2; }
                catch (Exception) { return null; }
            }
            return TradeMath.Settings.Resolve(
                Param("StrangerTradeSelfStockValueRate"),
                Param("StrangerTradeDealLineDiscount"),
                Param("StrangerTradeDealLineMaxDiscount"),
                Param("StrangerTradeBarScale"));
        }

        // An item with its own stats (a cooked dish) gets its own tooltip lines; the others share those of their config.
        private static string InfoKey(Data_Item item)
        {
            var vd = item.InstanceVD;
            return vd != null && vd.Length > 0 ? "L" + item.LogicId : item.ItemConfigId.ToString();
        }

        private static void AddInfo(ConfigManager config, List<Data_Item> items, PageJson.Data data)
        {
            var added = new HashSet<string>();
            foreach (var info in data.Info) added.Add(info.Key);
            foreach (var item in items)
            {
                string key = InfoKey(item);
                if (!added.Add(key)) continue;
                var info = ConfigInfo(config, config.Get_Config_Item(item.ItemConfigId), key);
                var vd = item.InstanceVD;
                if (vd != null && vd.Length > 0)
                    for (int i = 0; i < 5 && i < vd.Length; i++) info.Stats[i] = vd[i];
                data.Info.Add(info);
            }
        }

        // The tooltip lines of a config: the food subcategory, the uses, the stats of one use, the text of a book, and
        // the crop of a seed.
        private static PageJson.Info ConfigInfo(ConfigManager config, Config_Item cfg, string key)
        {
            var info = new PageJson.Info { Key = key, Stats = new float[5] };
            if (cfg == null) return info;
            info.Uses = cfg.UseTimes;
            info.Stats[0] = cfg.ValueDisplay1;
            info.Stats[1] = cfg.ValueDisplay2;
            info.Stats[2] = cfg.ValueDisplay3;
            info.Stats[3] = cfg.ValueDisplay4;
            info.Stats[4] = cfg.ValueDisplay5;
            if (cfg.Category == 1) info.Sub = ModTexts.SubCategoryName(cfg.SubCategory);
            if (cfg.Category == 3) info.Read = TradeData.ReadText(LocalText(config, cfg.ItemDes2) ?? cfg.ItemDes2_Local);
            if (cfg.Plant > 0)
            {
                try
                {
                    var gain = config.Get_Config_Plant(cfg.Plant)?.Gain;
                    var crop = gain != null && gain.Count > 0 ? config.Get_Config_Item(gain[0]) : null;
                    if (crop != null) info.Crop = LocalText(config, crop.ItemName) ?? crop.ItemName_Local ?? "";
                }
                catch (Exception e)
                {
                    if (warned.Add(e.Message)) Plugin.Log.LogWarning($"Better Trade: no crop for seed {cfg.ID}: {e.Message}");
                }
            }
            return info;
        }

        // The text of a config key in the current display language, or null when the game has none. The _Local fields
        // of Config_Item (a book text, an item name) hold the Chinese text also when the display language is English.
        private static string LocalText(ConfigManager config, string key)
        {
            if (string.IsNullOrEmpty(key)) return null;
            string text = config.GetLocalTxt(key);
            return string.IsNullOrEmpty(text) || text == key ? null : text;
        }
    }
}
