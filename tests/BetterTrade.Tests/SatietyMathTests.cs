using BetterTrade;
using Xunit;

namespace BetterTrade.Tests
{
    // The numbers of Deliver Supplies, the donation, and Deliver Request.
    public class SatietyMathTests
    {
        // SupplyDim of the game.
        private const int DimSatiety = 0, DimSeed = 1, DimMaterial = 2, DimMedicine = 4;
        private const int Fuel = 13;

        [Fact]
        public void Two_Instant_Rice_for_a_neighbor_add_satiety_80()
        {
            var r = TradeMath.SupplyAmount(DimSatiety, 80);

            Assert.Equal(TradeMath.SupplyKind.Satiety, r.Kind);
            Assert.Equal(80, r.Amount);
        }

        [Fact]
        public void A_neighbor_supply_takes_the_kind_of_the_game_conversion()
        {
            Assert.Equal(TradeMath.SupplyKind.Seed, TradeMath.SupplyAmount(DimSeed, 3).Kind);
            Assert.Equal(TradeMath.SupplyKind.Material, TradeMath.SupplyAmount(DimMaterial, 30).Kind);
            Assert.Equal(TradeMath.SupplyKind.Medicine, TradeMath.SupplyAmount(DimMedicine, 56).Kind);
        }

        [Fact]
        public void A_book_adds_nothing_to_a_neighbor()
        {
            // ConvertItem gives 0 for a category that it does not convert.
            Assert.Equal(TradeMath.SupplyKind.None, TradeMath.SupplyAmount(DimSatiety, 0).Kind);
        }

        [Fact]
        public void A_camp_takes_food_as_satiety_and_a_material_as_material()
        {
            Assert.Equal((TradeMath.SupplyKind.Satiety, 80), Pair(TradeMath.CampGain(1, 0, DimSatiety, 80, 2)));
            Assert.Equal((TradeMath.SupplyKind.Material, 30), Pair(TradeMath.CampGain(9, 0, DimMaterial, 30, 1)));
        }

        [Fact]
        public void A_camp_takes_a_fuel_as_its_burn_value_times_the_count()
        {
            Assert.Equal((TradeMath.SupplyKind.Fuel, 45), Pair(TradeMath.CampGain(Fuel, 15, 0, 0, 3)));
            Assert.Equal(TradeMath.SupplyKind.None, TradeMath.CampGain(Fuel, 0, 0, 0, 3).Kind);
        }

        [Fact]
        public void A_seed_or_a_medicine_adds_nothing_to_a_camp()
        {
            Assert.Equal(TradeMath.SupplyKind.None, TradeMath.CampGain(10, 0, DimSeed, 3, 1).Kind);
            Assert.Equal(TradeMath.SupplyKind.None, TradeMath.CampGain(2, 0, DimMedicine, 56, 1).Kind);
        }

        [Fact]
        public void Two_Instant_Rice_in_the_donation_add_satiety_80()
        {
            Assert.Equal(80f, TradeMath.DonateSatiety(useTimes: 0, maxUseTimes: 0, cfgUses: 1, instanceSatiety: null, cfgSatiety: 40f, count: 2));
        }

        [Fact]
        public void A_part_used_donation_item_counts_its_uses_left_and_its_own_satiety()
        {
            Assert.Equal(37.5f, TradeMath.DonateSatiety(useTimes: 3, maxUseTimes: 10, cfgUses: 10, instanceSatiety: 12.5f, cfgSatiety: 10f, count: 1));
        }

        [Fact]
        public void A_donation_item_with_no_use_left_counts_its_max_uses_then_its_config_uses()
        {
            Assert.Equal(40f, TradeMath.DonateSatiety(useTimes: 0, maxUseTimes: 4, cfgUses: 2, instanceSatiety: null, cfgSatiety: 10f, count: 1));
            Assert.Equal(20f, TradeMath.DonateSatiety(useTimes: 0, maxUseTimes: 0, cfgUses: 2, instanceSatiety: null, cfgSatiety: 10f, count: 1));
        }

        [Fact]
        public void Wire_in_the_donation_adds_nothing()
        {
            Assert.Equal(0f, TradeMath.DonateSatiety(useTimes: 0, maxUseTimes: 0, cfgUses: 1, instanceSatiety: null, cfgSatiety: 0f, count: 2));
        }

        [Fact]
        public void The_supply_order_is_satiety_seed_material_medicine_fuel()
        {
            Assert.True(TradeMath.SupplyOrder(TradeMath.SupplyKind.Satiety) < TradeMath.SupplyOrder(TradeMath.SupplyKind.Seed));
            Assert.True(TradeMath.SupplyOrder(TradeMath.SupplyKind.Seed) < TradeMath.SupplyOrder(TradeMath.SupplyKind.Material));
            Assert.True(TradeMath.SupplyOrder(TradeMath.SupplyKind.Material) < TradeMath.SupplyOrder(TradeMath.SupplyKind.Medicine));
            Assert.True(TradeMath.SupplyOrder(TradeMath.SupplyKind.Medicine) < TradeMath.SupplyOrder(TradeMath.SupplyKind.Fuel));
            Assert.True(TradeMath.SupplyOrder(TradeMath.SupplyKind.Fuel) < TradeMath.SupplyOrder(TradeMath.SupplyKind.None));
        }

        private static (TradeMath.SupplyKind, int) Pair(TradeMath.SupplyResult r) => (r.Kind, r.Amount);
    }
}
