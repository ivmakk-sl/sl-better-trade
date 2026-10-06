using System.Collections.Generic;
using System.Linq;
using BetterTrade;
using Xunit;

namespace BetterTrade.Tests
{
    // The rows of the delivery request list that get a delivery request reward, and the reward items.
    public class RewardDataTests
    {
        [Fact]
        public void An_aid_platform_delivery_request_reads_the_reward_of_its_commission_number()
        {
            var r = RewardData.SourceOf(1, 7, 24);

            Assert.Equal(RewardData.Source.AidPlatform, r.Source);
            Assert.Equal(24, r.Key);
        }

        [Fact]
        public void A_radio_aid_delivery_request_reads_the_reward_of_its_aid_channel_number()
        {
            var r = RewardData.SourceOf(4, 1020, 0);

            Assert.Equal(RewardData.Source.AidChannel, r.Source);
            Assert.Equal(20, r.Key);
        }

        [Fact]
        public void An_aid_platform_row_with_no_commission_number_gets_no_reward()
        {
            Assert.Equal(RewardData.Source.None, RewardData.SourceOf(1, 7, 0).Source);
        }

        [Fact]
        public void A_neighbor_commission_the_sample_request_a_casual_order_and_the_race_get_no_reward()
        {
            Assert.Equal(RewardData.Source.None, RewardData.SourceOf(4, 12, 0).Source);
            Assert.Equal(RewardData.Source.None, RewardData.SourceOf(5, 1, 0).Source);
            Assert.Equal(RewardData.Source.None, RewardData.SourceOf(6, 3, 0).Source);
            Assert.Equal(RewardData.Source.None, RewardData.SourceOf(2, 0, 0).Source);
        }

        [Fact]
        public void The_reward_items_keep_the_game_order_and_drop_an_empty_entry()
        {
            var items = RewardData.Items(new[]
            {
                new KeyValuePair<int, int>(2177, 3),
                new KeyValuePair<int, int>(0, 2),
                new KeyValuePair<int, int>(2138, 0),
                new KeyValuePair<int, int>(9032, 1),
            });

            Assert.Equal(new[] { (2177, 3), (9032, 1) }, items.Select(i => (i.Id, i.Count)));
        }
    }
}
