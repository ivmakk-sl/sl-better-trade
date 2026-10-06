using System.Linq;
using BetterTrade;
using Xunit;

namespace BetterTrade.Tests
{
    // The request demands of a row of the delivery request list: the need, the delivered amount, and the count text
    // at the right end of the bar.
    public class RequestDataTests
    {
        private static RequestData.Demand D(int need, int paid, bool done = false) => new RequestData.Demand { Need = need, Paid = paid, Done = done };

        [Fact]
        public void A_request_demand_of_3_with_1_delivered_shows_1_of_3()
        {
            var r = RequestData.Demands(new[] { D(3, 1) });

            Assert.Single(r);
            Assert.Equal(3, r[0].Need);
            Assert.Equal(1, r[0].Paid);
            Assert.Equal("1/3", r[0].Count);
            Assert.False(r[0].Done);
        }

        [Fact]
        public void The_count_is_the_delivered_amount_over_the_need()
        {
            Assert.Equal(new[] { "1/3", "21/20", "0/300" }, RequestData.Demands(new[] { D(3, 1), D(20, 21), D(300, 0) }).Select(d => d.Count));
        }

        [Fact]
        public void The_rows_with_game_data_are_the_aid_platform_and_the_aid_channel()
        {
            Assert.Equal(RequestData.RowSource.AidPlatform, RequestData.SourceOf(1, 7));
            Assert.Equal(RequestData.RowSource.AidChannel, RequestData.SourceOf(4, 1020));
            Assert.Equal(20, RequestData.ChannelOf(1020));
            Assert.Equal(RequestData.RowSource.None, RequestData.SourceOf(4, 12));
            Assert.Equal(RequestData.RowSource.None, RequestData.SourceOf(5, 1));
            Assert.Equal(RequestData.RowSource.None, RequestData.SourceOf(6, 3));
            Assert.Equal(RequestData.RowSource.None, RequestData.SourceOf(2, 0));
        }

        private static RequestData.Line L(int kind, int itemId, params int[] picks) => new RequestData.Line { Kind = kind, ItemId = itemId, PickIds = picks };

        [Fact]
        public void Item_lines_of_a_radio_aid_delivery_request_give_their_items_in_order()
        {
            // Aid: Distribution Room Power: Home Power Storage Station Package, Integrated Circuit, Electrical Wire.
            var ids = RequestData.ItemIds(4, 1015, new[] { 0, 0, 0 }, new[] { L(0, 14013), L(0, 20371), L(0, 20372) });

            Assert.Equal(new[] { 14013, 20371, 20372 }, ids);
        }

        [Fact]
        public void A_total_line_gives_no_item_and_the_item_lines_keep_theirs()
        {
            // Aid: Water Run Buses: Electrical Wire, Stainless Steel Plate, Fuel (total burn value).
            var ids = RequestData.ItemIds(4, 1017, new[] { 0, 0, 1 }, new[] { L(0, 20372), L(0, 20373), L(4, 0) });

            Assert.Equal(new[] { 20372, 20373, 0 }, ids);
        }

        [Fact]
        public void A_category_line_gives_no_item()
        {
            Assert.Equal(new[] { 0 }, RequestData.ItemIds(4, 1013, new[] { 2 }, new[] { L(1, 0) }));
        }

        [Fact]
        public void A_line_with_a_choice_of_items_gives_no_item()
        {
            Assert.Equal(new[] { 0 }, RequestData.ItemIds(4, 1040, new[] { 0 }, new[] { L(0, 2501, 2501, 2502) }));
            Assert.Equal(new[] { 2501 }, RequestData.ItemIds(4, 1040, new[] { 0 }, new[] { L(0, 2501, 2501) }));
        }

        [Fact]
        public void A_kinds_request_demand_with_one_line_for_each_candidate_gives_no_item_for_the_row()
        {
            // Aid: Soft Food: one request demand "Different vegetable dishes", with an item line for each candidate.
            var ids = RequestData.ItemIds(4, 1005, new[] { 3 }, new[] { L(0, 12135), L(0, 12223), L(0, 12243) });

            Assert.Equal(new[] { 0 }, ids);
        }

        [Fact]
        public void A_line_whose_kind_does_not_match_the_request_demand_gives_no_item()
        {
            Assert.Equal(new[] { 0, 20372 }, RequestData.ItemIds(4, 1017, new[] { 1, 0 }, new[] { L(0, 20371), L(0, 20372) }));
        }

        [Fact]
        public void An_aid_platform_delivery_request_gives_the_items_of_its_item_lines()
        {
            // AidCommission 24: Hunting Bow (kind 0), then two category lines (kind 2).
            Assert.Equal(new[] { 2405, 0, 0 }, RequestData.ItemIds(1, 7, new[] { 0, 2, 2 }, new[] { L(0, 2405), L(2, 0), L(2, 0) }));
        }

        [Fact]
        public void A_neighbor_commission_and_the_other_rows_give_no_item()
        {
            Assert.Equal(new[] { 0 }, RequestData.ItemIds(4, 12, new[] { 0 }, new[] { L(0, 20372) }));
            Assert.Equal(new[] { 0 }, RequestData.ItemIds(5, 1, new[] { 0 }, new[] { L(0, 20372) }));
            Assert.Equal(new[] { 0 }, RequestData.ItemIds(6, 3, new[] { 0 }, new[] { L(0, 20372) }));
        }

        [Fact]
        public void No_lines_give_no_item()
        {
            Assert.Equal(new[] { 0, 0 }, RequestData.ItemIds(4, 1015, new[] { 0, 0 }, null));
        }

        [Fact]
        public void A_done_request_demand_keeps_its_count()
        {
            var r = RequestData.Demands(new[] { D(2, 2), D(3, 1, done: true), D(2, 5) });

            Assert.True(r[0].Done);
            Assert.Equal("2/2", r[0].Count);
            Assert.True(r[1].Done);
            Assert.Equal("1/3", r[1].Count);
            Assert.True(r[2].Done);
            Assert.Equal("5/2", r[2].Count);
        }
    }
}
