using BetterTrade;
using Xunit;

namespace BetterTrade.Tests
{
    public class TradeMathTests
    {
        private const int Food = 1;
        private const int Medicine = 2;
        private const int Material = 10;

        // A camp of a Trade Run with the half value category Food and no wanted category.
        private static TradeMath.Trader Camp() => new TradeMath.Trader
        {
            HalfValueCategory = Food,
            HalfRate = 0.5f,
            IsTradeRunPoint = true,
            IsCampPoint = true,
        };

        private static TradeMath.GiveLine Line(int category, int tradeValue, int count = 1, int useTimes = 0, int maxUseTimes = 0, int cfgUses = 1, float sellRate = 0f) =>
            new TradeMath.GiveLine
            {
                Category = category,
                TradeValue = tradeValue,
                Count = count,
                UseTimes = useTimes,
                MaxUseTimes = maxUseTimes,
                CfgUses = cfgUses,
                CfgSellRate = sellRate,
            };

        [Fact]
        public void Hardtack_with_6_of_10_uses_at_a_camp_with_half_value_food_is_84_and_low()
        {
            var r = TradeMath.GiveValue(Line(Food, 28, useTimes: 6, maxUseTimes: 10, cfgUses: 10), Camp());

            Assert.Equal(84f, r.Value);
            Assert.Equal(TradeMath.Factor.Low, r.Class);
        }

        // A neighbor that wants Medicine with the boost 0.6.
        private static TradeMath.Trader WantsMedicine(float boost = 0.6f, float boostMax = 0.6f, float appraisal = 0f) => new TradeMath.Trader
        {
            DemandCategory = Medicine,
            Boost = boost,
            BoostMax = boostMax,
            AppraisalBoost = appraisal,
        };

        [Fact]
        public void Bandage_wanted_with_factor_1_6_is_89_6_and_wanted()
        {
            var r = TradeMath.GiveValue(Line(Medicine, 56), WantsMedicine());

            Assert.Equal(89.6f, r.Value, 3);
            Assert.Equal(TradeMath.Factor.Wanted, r.Class);
            Assert.Equal(90, TradeMath.Shown(r.Value));
        }

        [Fact]
        public void The_demand_mask_names_the_wanted_categories()
        {
            var trader = new TradeMath.Trader { DemandCategoryMask = (1 << Medicine) | (1 << Material), Boost = 0.5f };

            Assert.Equal(TradeMath.Factor.Wanted, TradeMath.GiveValue(Line(Material, 30), trader).Class);
            Assert.Equal(45f, TradeMath.GiveValue(Line(Material, 30), trader).Value, 3);
            Assert.Equal(TradeMath.Factor.Full, TradeMath.GiveValue(Line(Food, 30), trader).Class);
        }

        [Fact]
        public void Two_wire_with_no_factor_is_60_and_full()
        {
            var r = TradeMath.GiveValue(Line(Material, 30, count: 2), WantsMedicine());

            Assert.Equal(60f, r.Value);
            Assert.Equal(TradeMath.Factor.Full, r.Class);
        }

        [Fact]
        public void The_boost_is_limited_by_BoostMax_only_when_BoostMax_is_above_zero()
        {
            Assert.Equal(56f * 1.3f, TradeMath.GiveValue(Line(Medicine, 56), WantsMedicine(boost: 0.6f, boostMax: 0.3f)).Value, 3);
            Assert.Equal(56f * 1.6f, TradeMath.GiveValue(Line(Medicine, 56), WantsMedicine(boost: 0.6f, boostMax: 0f)).Value, 3);
            Assert.Equal(56f * 1.6f, TradeMath.GiveValue(Line(Medicine, 56), WantsMedicine(boost: 0.6f, boostMax: -1f)).Value, 3);
        }

        [Fact]
        public void A_negative_boost_counts_as_zero()
        {
            var r = TradeMath.GiveValue(Line(Medicine, 56), WantsMedicine(boost: -0.2f));

            Assert.Equal(56f, r.Value, 3);
        }

        [Fact]
        public void The_appraisal_boost_adds_to_the_factor_of_each_item_and_a_negative_one_counts_as_zero()
        {
            Assert.Equal(30f * 1.2f, TradeMath.GiveValue(Line(Material, 30), WantsMedicine(appraisal: 0.2f)).Value, 3);
            Assert.Equal(56f * 1.8f, TradeMath.GiveValue(Line(Medicine, 56), WantsMedicine(appraisal: 0.2f)).Value, 3);
            Assert.Equal(30f, TradeMath.GiveValue(Line(Material, 30), WantsMedicine(appraisal: -0.5f)).Value, 3);
        }

        [Fact]
        public void An_aid_category_equal_to_the_half_value_category_keeps_full_value()
        {
            var trader = Camp();
            trader.AidDemandCategory = Food;

            var r = TradeMath.GiveValue(Line(Food, 28, useTimes: 6, maxUseTimes: 10, cfgUses: 10), trader);

            Assert.Equal(168f, r.Value);
            Assert.Equal(TradeMath.Factor.Full, r.Class);
        }

        [Fact]
        public void A_robot_module_with_sell_rate_0_6_on_a_Trade_Run_point_is_low()
        {
            var r = TradeMath.GiveValue(Line(Material, 100, sellRate: 0.6f), Camp());

            Assert.Equal(60f, r.Value, 3);
            Assert.Equal(TradeMath.Factor.Low, r.Class);
        }

        [Fact]
        public void The_sell_rate_counts_only_on_a_Trade_Run_point_and_only_inside_0_and_1()
        {
            Assert.Equal(100f, TradeMath.GiveValue(Line(Material, 100, sellRate: 0.6f), WantsMedicine()).Value, 3);
            Assert.Equal(100f, TradeMath.GiveValue(Line(Material, 100, sellRate: 1f), Camp()).Value, 3);
            Assert.Equal(100f, TradeMath.GiveValue(Line(Material, 100, sellRate: 0f), Camp()).Value, 3);
        }

        [Fact]
        public void A_half_used_stack_counts_its_uses_left()
        {
            // 3 Hardtack that share one use count: 5 of 10 uses left.
            var r = TradeMath.GiveValue(Line(Material, 28, count: 3, useTimes: 5, maxUseTimes: 10, cfgUses: 10), new TradeMath.Trader());

            Assert.Equal(28f * 3 * 5, r.Value, 3);
        }

        [Fact]
        public void An_item_with_no_use_count_counts_as_one_use()
        {
            Assert.Equal(1f, TradeMath.EffectiveUses(0, 0, 10));
            Assert.Equal(1f, TradeMath.EffectiveUses(0, 0, 0));
        }

        [Fact]
        public void The_config_uses_stand_for_the_max_uses_when_the_item_has_none()
        {
            Assert.Equal(6f, TradeMath.EffectiveUses(6, 0, 10));
            Assert.Equal(4f, TradeMath.EffectiveUses(2, 5, 10));
        }

        [Fact]
        public void An_offered_unit_is_worth_its_trade_value_times_its_config_uses()
        {
            Assert.Equal(91, TradeMath.TakeUnitValue(13, 7, isMedicine: false, isCampPoint: false, medicineRate: 2f));
            Assert.Equal(10, TradeMath.TakeUnitValue(10, 0, isMedicine: false, isCampPoint: false, medicineRate: 2f));
        }

        [Fact]
        public void Medicine_at_a_camp_point_is_worth_double()
        {
            Assert.Equal(112, TradeMath.TakeUnitValue(56, 1, isMedicine: true, isCampPoint: true, medicineRate: 2f));
            Assert.Equal(56, TradeMath.TakeUnitValue(56, 1, isMedicine: true, isCampPoint: false, medicineRate: 2f));
            Assert.Equal(56, TradeMath.TakeUnitValue(56, 1, isMedicine: true, isCampPoint: true, medicineRate: 1f));
        }

        [Fact]
        public void The_medicine_rate_rounds_a_half_to_even()
        {
            Assert.Equal(38, TradeMath.TakeUnitValue(25, 1, isMedicine: true, isCampPoint: true, medicineRate: 1.5f));
            Assert.Equal(40, TradeMath.TakeUnitValue(27, 1, isMedicine: true, isCampPoint: true, medicineRate: 1.5f));
        }

        private static readonly TradeMath.Settings NoTalent = TradeMath.Settings.Resolve(selfStockRate: 0.5f, dealLineDiscount: 0f, dealLineMaxDiscount: 60f, barScale: 120f);

        [Fact]
        public void An_offer_of_56_for_goods_of_72_is_short_by_16()
        {
            var t = TradeMath.Totals(new[] { 56f }, new[] { 72 }, 0f, NoTalent);

            Assert.Equal(56f, t.Offer);
            Assert.Equal(72, t.Goods);
            Assert.Equal(72f, t.DealLine);
        }

        [Fact]
        public void The_offer_and_the_goods_are_the_sums_of_their_lines()
        {
            var t = TradeMath.Totals(new[] { 50f, 32f }, new[] { 40, 32 }, 0f, NoTalent);

            Assert.Equal(82f, t.Offer);
            Assert.Equal(72, t.Goods);
        }

        [Fact]
        public void A_talent_of_20_lowers_the_deal_line_to_52()
        {
            var t = TradeMath.Totals(new[] { 56f }, new[] { 72 }, 20f, NoTalent);

            Assert.Equal(52f, t.DealLine);
        }

        [Fact]
        public void The_deal_line_discount_stays_inside_the_setting_maximum_and_the_goods()
        {
            Assert.Equal(60f, TradeMath.Totals(new float[0], new[] { 200 }, 90f, NoTalent).Discount);
            Assert.Equal(30f, TradeMath.Totals(new float[0], new[] { 30 }, 50f, NoTalent).Discount);
            Assert.Equal(0f, TradeMath.Totals(new float[0], new[] { 30 }, -50f, NoTalent).Discount);
        }

        [Fact]
        public void The_bar_net_is_the_offer_minus_the_goods_over_the_bar_scale()
        {
            var t = TradeMath.Totals(new[] { 56f }, new[] { 72 }, 20f, NoTalent);

            Assert.Equal(-16f / 120f, t.BarNet, 5);
        }

        [Fact]
        public void The_settings_take_the_game_fallbacks()
        {
            var s = TradeMath.Settings.Resolve(selfStockRate: null, dealLineDiscount: null, dealLineMaxDiscount: null, barScale: null);
            Assert.Equal(0.5f, s.HalfRate);
            Assert.Equal(0f, s.DealLineDiscount);
            Assert.Equal(60f, s.DealLineMaxDiscount);
            Assert.Equal(120f, s.BarScale);

            Assert.Equal(0.5f, TradeMath.Settings.Resolve(0f, 0f, 60f, 0f).HalfRate);
            Assert.Equal(1f, TradeMath.Settings.Resolve(1.5f, 0f, 60f, 0f).HalfRate);
            Assert.Equal(120f, TradeMath.Settings.Resolve(0.5f, 0f, 60f, -1f).BarScale);
        }

        [Fact]
        public void The_appraisal_boost_sets_no_color()
        {
            Assert.Equal(TradeMath.Factor.Full, TradeMath.GiveValue(Line(Material, 30), WantsMedicine(appraisal: 0.2f)).Class);
        }
    }
}
