using System;
using System.Collections.Generic;

namespace BetterTrade
{
    // Builds the page records of a trade (PageJson) from the trade math. No game or BepInEx type here.
    public static class TradeData
    {
        // The expiry moment of a stack for the value order, as the game's isExpired check of the item JSON
        // reads it: the start time plus the time left, for an item whose config has a life; 0 for one that does not
        // spoil.
        public static long ExpiryOf(int life, int startTime, int timeLeft) => life > 0 ? (long)startTime + timeLeft : 0;

        // The cell of one stack of the character in a trade: its shown value, its factor class, and the parts of its
        // tooltip line.
        public static PageJson.Cell TradeCell(long id, TradeMath.GiveLine line, TradeMath.Trader trader)
        {
            var r = TradeMath.GiveValue(line, trader);
            var tip = new PageJson.Tip { TradeValue = line.TradeValue, Count = line.Count, Uses = r.Uses };
            if (Math.Abs(r.Multiplier - 1f) > 0.001f)
                tip.Factors.Add(new PageJson.Factor { X = PageJson.FactorText(r.Multiplier), Why = r.Wanted ? "wanted" : "appraisal" });
            if (r.HalfRate < 1f) tip.Factors.Add(new PageJson.Factor { X = PageJson.FactorText(r.HalfRate), Why = "half" });
            if (r.SellRate < 1f) tip.Factors.Add(new PageJson.Factor { X = PageJson.FactorText(r.SellRate), Why = "sell" });
            return new PageJson.Cell
            {
                Id = id,
                Number = TradeMath.Shown(r.Value),
                Class = r.Class == TradeMath.Factor.Wanted ? "wanted" : r.Class == TradeMath.Factor.Low ? "low" : "full",
                Tip = tip,
            };
        }

        // The groups of the header: each wanted category with the demand factor, and the half value category with the
        // half rate (none when the aid category is the same). name gives the category name in the display language.
        public static (List<PageJson.Group> Wants, List<PageJson.Group> Half) Header(TradeMath.Trader trader, Func<int, string> name)
        {
            var wants = new List<PageJson.Group>();
            string wantedFactor = PageJson.FactorText(1f + TradeMath.ClampedBoost(trader));
            for (int category = 1; category < 32; category++)
                if (TradeMath.IsWanted(category, trader))
                    wants.Add(new PageJson.Group { Name = name(category), X = wantedFactor });

            var half = new List<PageJson.Group>();
            int h = trader.HalfValueCategory;
            if (h > 0 && h != trader.AidDemandCategory && trader.HalfRate < 1f)
                half.Add(new PageJson.Group { Name = name(h), X = PageJson.FactorText(trader.HalfRate) });
            return (wants, half);
        }

        // The text of a book for its tooltip line, on one line: the game's text has the mark "\n" (a backslash and n,
        // not a line break) before the lasting effect, and some texts have real line breaks.
        public static string ReadText(string text)
        {
            if (string.IsNullOrEmpty(text)) return "";
            var parts = text.Replace("\\n", " ").Split(new[] { ' ', '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries);
            return string.Join(" ", parts);
        }

        // The bar numbers as the page shows them. picked is true when the player picked any goods.
        public static PageJson.Bar BarOf(TradeMath.TotalsResult t, bool picked) => new PageJson.Bar
        {
            Offer = TradeMath.Shown(t.Offer),
            Goods = t.Goods,
            DealLine = TradeMath.Shown(t.DealLine),
            Picked = picked,
        };

        // The self-check of the copied formulas: offer - goods against the game's BarNet x bar scale.
        public static bool SelfCheck(TradeMath.TotalsResult t, float gameBarNet, float barScale) =>
            Math.Abs((t.Offer - t.Goods) - gameBarNet * barScale) <= 0.5f;
    }
}
