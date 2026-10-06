using System.Linq;
using BetterTrade;
using Xunit;

namespace BetterTrade.Tests
{
    // The page records of a trade, built from the trade math.
    public class TradeDataTests
    {
        private const int Food = 1, Medicine = 2, Material = 9;

        private static string Name(int category) => category == Food ? "Food" : category == Medicine ? "Medicine" : "Material";

        private static TradeMath.GiveLine Line(int category, int tradeValue, int count = 1, int useTimes = 0, int maxUseTimes = 0, int cfgUses = 1, float sellRate = 0f) =>
            new TradeMath.GiveLine { Category = category, TradeValue = tradeValue, Count = count, UseTimes = useTimes, MaxUseTimes = maxUseTimes, CfgUses = cfgUses, CfgSellRate = sellRate };

        private static TradeMath.Trader Camp() => new TradeMath.Trader { HalfValueCategory = Food, HalfRate = 0.5f, IsTradeRunPoint = true, IsCampPoint = true };

        private static TradeMath.Trader WantsMedicine(float appraisal = 0f) => new TradeMath.Trader { DemandCategory = Medicine, Boost = 0.6f, BoostMax = 0.6f, AppraisalBoost = appraisal };

        [Fact]
        public void A_Hardtack_cell_at_a_camp_is_84_low_with_the_half_factor()
        {
            var cell = TradeData.TradeCell(101, Line(Food, 28, useTimes: 6, maxUseTimes: 10, cfgUses: 10), Camp());

            Assert.Equal(101, cell.Id);
            Assert.Equal(84, cell.Number);
            Assert.Equal("low", cell.Class);
            Assert.Equal(28, cell.Tip.TradeValue);
            Assert.Equal(1, cell.Tip.Count);
            Assert.Equal(6f, cell.Tip.Uses);
            Assert.Equal(new[] { ("×½", "half") }, cell.Tip.Factors.Select(f => (f.X, f.Why)));
        }

        [Fact]
        public void A_wanted_cell_has_one_factor_with_the_appraisal_boost_in_it()
        {
            var cell = TradeData.TradeCell(102, Line(Medicine, 56), WantsMedicine(appraisal: 0.2f));

            Assert.Equal(101, cell.Number);
            Assert.Equal("wanted", cell.Class);
            Assert.Equal(new[] { ("×1.8", "wanted") }, cell.Tip.Factors.Select(f => (f.X, f.Why)));
        }

        [Fact]
        public void The_appraisal_boost_alone_is_an_appraisal_factor_of_a_full_cell()
        {
            var cell = TradeData.TradeCell(103, Line(Material, 30, count: 2), WantsMedicine(appraisal: 0.2f));

            Assert.Equal(72, cell.Number);
            Assert.Equal("full", cell.Class);
            Assert.Equal(new[] { ("×1.2", "appraisal") }, cell.Tip.Factors.Select(f => (f.X, f.Why)));
        }

        [Fact]
        public void A_full_cell_with_no_factor_has_none()
        {
            var cell = TradeData.TradeCell(104, Line(Material, 30, count: 2), WantsMedicine());

            Assert.Equal(60, cell.Number);
            Assert.Empty(cell.Tip.Factors);
        }

        [Fact]
        public void A_robot_module_has_the_sell_factor()
        {
            var cell = TradeData.TradeCell(105, Line(Material, 100, sellRate: 0.6f), Camp());

            Assert.Equal(new[] { ("×0.6", "sell") }, cell.Tip.Factors.Select(f => (f.X, f.Why)));
        }

        [Fact]
        public void A_camp_header_has_the_half_value_group_and_no_wants_group()
        {
            var (wants, half) = TradeData.Header(Camp(), Name);

            Assert.Empty(wants);
            Assert.Equal(new[] { ("Food", "×½") }, half.Select(g => (g.Name, g.X)));
        }

        [Fact]
        public void A_neighbor_header_has_the_wants_group_and_no_half_value_group()
        {
            var (wants, half) = TradeData.Header(WantsMedicine(appraisal: 0.2f), Name);

            Assert.Equal(new[] { ("Medicine", "×1.6") }, wants.Select(g => (g.Name, g.X)));
            Assert.Empty(half);
        }

        [Fact]
        public void The_demand_mask_gives_one_wants_group_for_each_category()
        {
            var trader = new TradeMath.Trader { DemandCategoryMask = (1 << Medicine) | (1 << Material), Boost = 0.5f };

            var (wants, _) = TradeData.Header(trader, Name);

            Assert.Equal(new[] { ("Medicine", "×1.5"), ("Material", "×1.5") }, wants.Select(g => (g.Name, g.X)));
        }

        [Fact]
        public void An_aid_category_equal_to_the_half_value_category_has_no_half_value_group()
        {
            var trader = Camp();
            trader.AidDemandCategory = Food;

            Assert.Empty(TradeData.Header(trader, Name).Half);
        }

        [Fact]
        public void The_bar_has_the_shown_totals()
        {
            var totals = TradeMath.Totals(new[] { 55.6f }, new[] { 72 }, 20f, TradeMath.Settings.Resolve(null, null, null, null));

            var bar = TradeData.BarOf(totals, picked: true);

            Assert.Equal(56, bar.Offer);
            Assert.Equal(72, bar.Goods);
            Assert.Equal(52, bar.DealLine);
            Assert.True(bar.Picked);
        }

        [Fact]
        public void The_self_check_passes_when_the_game_bar_net_matches_within_a_half()
        {
            var totals = TradeMath.Totals(new[] { 56f }, new[] { 72 }, 0f, TradeMath.Settings.Resolve(null, null, null, null));

            Assert.True(TradeData.SelfCheck(totals, -16f / 120f, 120f));
            Assert.True(TradeData.SelfCheck(totals, -16.4f / 120f, 120f));
            Assert.False(TradeData.SelfCheck(totals, -17f / 120f, 120f));
        }

        [Fact]
        public void The_book_text_of_Cooking_shows_its_line_break_mark_as_one_space()
        {
            string text = "Read for 1 hour; for 24 hours, reduces Satiety but increases eating effects by 30%, \\nMax Satiety permanently +2";

            Assert.Equal("Read for 1 hour; for 24 hours, reduces Satiety but increases eating effects by 30%, Max Satiety permanently +2", TradeData.ReadText(text));
        }

        [Fact]
        public void A_book_text_with_a_real_line_break_shows_on_one_line()
        {
            Assert.Equal("密密麻麻都是自己的字迹。 阅读1小时", TradeData.ReadText("密密麻麻都是自己的字迹。\r\n阅读1小时 "));
            Assert.Equal("", TradeData.ReadText(null));
        }

        [Fact]
        public void An_item_that_spoils_expires_at_its_start_time_plus_its_time_left()
        {
            Assert.Equal(1_500_000L, TradeData.ExpiryOf(life: 72, startTime: 1_200_000, timeLeft: 300_000));
        }

        [Fact]
        public void An_item_that_does_not_spoil_has_no_expiry()
        {
            Assert.Equal(0L, TradeData.ExpiryOf(life: 0, startTime: 1_200_000, timeLeft: 300_000));
        }

        [Fact]
        public void A_late_expiry_does_not_overflow()
        {
            Assert.Equal(4_000_000_000L, TradeData.ExpiryOf(life: 1, startTime: 2_000_000_000, timeLeft: 2_000_000_000));
        }
    }
}
