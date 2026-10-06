using System.Linq;
using BetterTrade;
using Xunit;

namespace BetterTrade.Tests
{
    // The number and the dim of a cell in Deliver Request, from two takes of the game's drop check: the Add of each
    // request demand without the stack of the cell and with it.
    public class DispatchCountTests
    {
        [Fact]
        public void A_Pheasant_adds_36_to_a_satiety_request_demand()
        {
            var r = DispatchCount.Of(new[] { 0 }, new[] { 36 }, accepted: true);

            Assert.Equal(36, r.Number);
            Assert.False(r.Dim);
            Assert.Equal(new[] { (0, 36) }, r.Parts.Select(p => (p.Demand, p.Add)));
        }

        [Fact]
        public void A_fruit_adds_its_satiety_to_a_total_request_demand()
        {
            var r = DispatchCount.Of(new[] { 40 }, new[] { 70 }, accepted: true);

            Assert.Equal(30, r.Number);
            Assert.False(r.Dim);
        }

        [Fact]
        public void A_stack_of_10_Carrots_with_3_needed_adds_10()
        {
            var r = DispatchCount.Of(new[] { 0, 0 }, new[] { 0, 10 }, accepted: true);

            Assert.Equal(10, r.Number);
            Assert.Equal(new[] { (1, 10) }, r.Parts.Select(p => (p.Demand, p.Add)));
        }

        [Fact]
        public void A_stack_that_adds_nothing_because_the_drone_holds_enough_is_dimmed()
        {
            var r = DispatchCount.Of(new[] { 1 }, new[] { 1 }, accepted: true);

            Assert.True(r.Dim);
            Assert.Equal(0, r.Number);
            Assert.Empty(r.Parts);
        }

        [Fact]
        public void A_stack_that_the_drone_refuses_is_dimmed_with_no_number()
        {
            var r = DispatchCount.Of(new[] { 0 }, new[] { 5 }, accepted: false);

            Assert.True(r.Dim);
            Assert.Equal(0, r.Number);
            Assert.Empty(r.Parts);
        }

        [Fact]
        public void A_stack_with_no_hint_is_dimmed_with_no_take()
        {
            var r = DispatchCount.Of(new[] { 0 }, null, accepted: false);

            Assert.True(r.Dim);
            Assert.Equal(0, r.Number);
            Assert.Empty(r.Parts);
        }

        [Fact]
        public void A_sample_crop_shows_its_first_request_demand_and_names_both()
        {
            var r = DispatchCount.Of(new[] { 0, 0, 0, 0 }, new[] { 5, 1, 0, 0 }, accepted: true);

            Assert.Equal(5, r.Number);
            Assert.False(r.Dim);
            Assert.Equal(new[] { (0, 5), (1, 1) }, r.Parts.Select(p => (p.Demand, p.Add)));
        }

        [Fact]
        public void A_drone_cell_shows_its_share_of_the_drone_cargo()
        {
            // The drone holds two dishes of 84 and 130: the take without the 130 dish is 84.
            var r = DispatchCount.Of(new[] { 84 }, new[] { 214 }, accepted: true);

            Assert.Equal(130, r.Number);
            Assert.False(r.Dim);
        }

        [Fact]
        public void Takes_of_a_different_length_give_a_dim()
        {
            var r = DispatchCount.Of(new[] { 0 }, new[] { 5, 1 }, accepted: true);

            Assert.True(r.Dim);
            Assert.Empty(r.Parts);
        }
    }
}
