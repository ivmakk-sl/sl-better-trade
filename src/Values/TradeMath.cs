using System;
using System.Collections.Generic;

namespace BetterTrade
{
    // The trade numbers that the game counts in Reducer_Web_TradeUI.EvaluateState and
    // TradeBalanceCalculator.Evaluate, copied because their helpers are inlined. No game or BepInEx type here.
    public static partial class TradeMath
    {
        public enum Factor { Full, Low, Wanted }

        // The trader fields of State_Web_TradeUI, and the half rate from the settings.
        public sealed class Trader
        {
            public int DemandCategory;
            public int DemandCategoryMask;
            public float Boost;
            public float BoostMax;
            public float AppraisalBoost;
            public int HalfValueCategory;
            public int AidDemandCategory;
            public float HalfRate = 1f;
            // NpcId < 1 and ShelfShopId > 0, in a trade (no mode flag).
            public bool IsTradeRunPoint;
            // A Trade Run point with CampState != 0.
            public bool IsCampPoint;
        }

        // One stack of the character that is in the trade.
        public sealed class GiveLine
        {
            public int Category;
            public int TradeValue;
            public int Count;
            public int UseTimes;
            public int MaxUseTimes;
            // Config_Item.UseTimes, as the config has it.
            public int CfgUses;
            // Config_Item.TradeSellRate.
            public float CfgSellRate;
        }

        public struct GiveResult
        {
            public float Value;
            public Factor Class;
            // The parts of the value: the uses counted, the demand factor plus the appraisal boost, and the rates.
            public float Uses;
            public bool Wanted;
            public float Multiplier;
            public float HalfRate;
            public float SellRate;
        }

        // The uses that a give line counts (Reducer_Web_TradeUI.EffectiveUses): the part of the uses left, times the
        // config uses; 1 for an item with no use count.
        public static float EffectiveUses(int useTimes, int maxUseTimes, int cfgUses)
        {
            int uses = cfgUses < 1 ? 1 : cfgUses;
            if (useTimes < 1) return 1f;
            int max = maxUseTimes > 0 ? maxUseTimes : uses;
            return (float)useTimes / max * uses;
        }

        // The value of one give line, as TradeBalanceCalculator.Evaluate adds it to the offer:
        // count x trade value x uses x (demand factor + appraisal boost) x half rate x sell rate.
        public static GiveResult GiveValue(GiveLine line, Trader trader)
        {
            float uses = EffectiveUses(line.UseTimes, line.MaxUseTimes, line.CfgUses);
            bool wanted = IsWanted(line.Category, trader);
            float demand = wanted ? 1f + ClampedBoost(trader) : 1f;
            float appraisal = trader.AppraisalBoost < 0f ? 0f : trader.AppraisalBoost;
            bool aid = trader.AidDemandCategory > 0 && line.Category == trader.AidDemandCategory;
            bool half = !aid && trader.HalfValueCategory > 0 && line.Category == trader.HalfValueCategory;
            float halfRate = half ? trader.HalfRate : 1f;
            float sellRate = trader.IsTradeRunPoint && line.CfgSellRate > 0f && line.CfgSellRate < 1f ? line.CfgSellRate : 1f;
            // The game's ValueScale of the line; 0 or less counts as 1.
            float scale = sellRate * halfRate;
            if (scale <= 0f) scale = 1f;
            float value = (float)(line.Count * line.TradeValue) * uses * (demand + appraisal) * scale;
            return new GiveResult
            {
                Value = value,
                Class = wanted ? Factor.Wanted : scale < 1f ? Factor.Low : Factor.Full,
                Uses = uses,
                Wanted = wanted,
                Multiplier = demand + appraisal,
                HalfRate = halfRate,
                SellRate = sellRate,
            };
        }

        // The value of one offered unit, as the goods count it (Reducer_Web_TradeUI.ResolveTakeTradeValue times the
        // config uses): Medicine at a camp point is worth the medicine rate (EndlessTradeTakeMedicineRate) times more.
        public static int TakeUnitValue(int tradeValue, int cfgUses, bool isMedicine, bool isCampPoint, float medicineRate)
        {
            int value = tradeValue;
            if (tradeValue > 0 && isMedicine && isCampPoint && medicineRate > 1f)
            {
                int raised = (int)Math.Round(tradeValue * medicineRate);
                value = raised < tradeValue ? tradeValue : raised;
            }
            return value * (cfgUses < 1 ? 1 : cfgUses);
        }

        // The settings of Config_GlobalSetting (Params2) that the trade reads, with the game's fallbacks for a
        // missing entry.
        public sealed class Settings
        {
            public float HalfRate;
            public float DealLineDiscount;
            public float DealLineMaxDiscount;
            public float BarScale;

            // StrangerTradeSelfStockValueRate, StrangerTradeDealLineDiscount, StrangerTradeDealLineMaxDiscount,
            // StrangerTradeBarScale; null for a missing entry.
            public static Settings Resolve(float? selfStockRate, float? dealLineDiscount, float? dealLineMaxDiscount, float? barScale)
            {
                float half = selfStockRate ?? 0f;
                if (half <= 0f) half = 0.5f;
                else if (half > 1f) half = 1f;
                float scale = barScale ?? 0f;
                return new Settings
                {
                    HalfRate = half,
                    DealLineDiscount = dealLineDiscount ?? 0f,
                    DealLineMaxDiscount = dealLineMaxDiscount ?? 60f,
                    BarScale = scale <= 0f ? 120f : scale,
                };
            }
        }

        public struct TotalsResult
        {
            // The float sum of the give lines (the game's GivenValue).
            public float Offer;
            // The sum of the take lines (the game's Threshold).
            public int Goods;
            // What the deal-line talents take off the goods.
            public float Discount;
            // The goods minus the discount: the offer that makes the deal.
            public float DealLine;
            // (offer - goods) / bar scale, as the game's BarNet, for the self-check.
            public float BarNet;
        }

        // The totals of TradeBalanceCalculator.Evaluate. giveValues are the GiveValue of each give line, takeLines the
        // value of each take line (count x TakeUnitValue). dealLineBonus is State_Web_TradeUI.DealLineBonus.
        public static TotalsResult Totals(IEnumerable<float> giveValues, IEnumerable<int> takeLines, float dealLineBonus, Settings settings)
        {
            float offer = 0f;
            foreach (float v in giveValues) offer += v;
            int goods = 0;
            foreach (int v in takeLines) goods += v;
            // Reducer_Web_TradeUI.ResolveDealLineDiscount, then the clamp of Evaluate to the goods.
            float discount = settings.DealLineDiscount + dealLineBonus;
            if (discount > settings.DealLineMaxDiscount) discount = settings.DealLineMaxDiscount;
            if (discount < 0f) discount = 0f;
            if (discount > goods) discount = goods;
            float dealLine = goods - discount;
            return new TotalsResult
            {
                Offer = offer,
                Goods = goods,
                Discount = discount,
                DealLine = dealLine,
                BarNet = (offer - goods) / settings.BarScale,
            };
        }

        // The number that the page shows for a value: the nearest whole number, a half up.
        public static int Shown(float value) => (int)Math.Round(value, MidpointRounding.AwayFromZero);

        // A category bit of DemandCategoryMask, or else DemandCategory (Reducer_Web_TradeUI.IsDemandCategory).
        public static bool IsWanted(int category, Trader trader)
        {
            if (category < 1) return false;
            if (trader.DemandCategoryMask > 0) return (trader.DemandCategoryMask & (1 << (category & 31))) != 0;
            return trader.DemandCategory > 0 && category == trader.DemandCategory;
        }

        // A negative boost counts as 0; BoostMax limits the boost only when it is above 0.
        public static float ClampedBoost(Trader trader)
        {
            if (trader.Boost < 0f) return 0f;
            if (trader.BoostMax > 0f && trader.Boost > trader.BoostMax) return trader.BoostMax;
            return trader.Boost;
        }
    }
}
