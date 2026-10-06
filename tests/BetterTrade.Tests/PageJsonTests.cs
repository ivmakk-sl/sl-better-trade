using System.Collections.Generic;
using System.IO;
using System.Text.Json.Nodes;
using BetterTrade;
using Xunit;

namespace BetterTrade.Tests
{
    public class PageJsonTests
    {
        // The data of tests/fixtures/data.json, which the page tests read too.
        private static PageJson.Data FixtureData() => new PageJson.Data
        {
            Mode = "trade",
            Words = new List<KeyValuePair<string, string>>
            {
                new KeyValuePair<string, string>("wants", "Wants"),
                new KeyValuePair<string, string>("halfValue", "Half value"),
                new KeyValuePair<string, string>("dealLine", "Deal line"),
            },
            Items = new List<PageJson.Cell>
            {
                new PageJson.Cell { Id = 101, Number = 84, Class = "low", InfoKey = "L101", Tip = new PageJson.Tip { TradeValue = 28, Count = 1, Uses = 6f, Factors = { new PageJson.Factor { X = "×½", Why = "half" } } } },
                new PageJson.Cell { Id = 102, Number = 90, Class = "wanted", InfoKey = "2400", Tip = new PageJson.Tip { TradeValue = 56, Count = 1, Uses = 1f, Factors = { new PageJson.Factor { X = "×1.6", Why = "wanted" } } } },
                new PageJson.Cell { Id = 103, Number = 60, Class = "full", Tip = new PageJson.Tip { TradeValue = 30, Count = 2, Uses = 1f } },
            },
            Shelf = new List<KeyValuePair<int, int>> { new KeyValuePair<int, int>(5001, 91), new KeyValuePair<int, int>(5002, 10) },
            Bar = new PageJson.Bar { Offer = 56, Goods = 72, DealLine = 52, Picked = true },
            Wants = new List<PageJson.Group> { new PageJson.Group { Name = "Medicine", X = "×1.6" } },
            Half = new List<PageJson.Group> { new PageJson.Group { Name = "Food", X = "×½" } },
            Requests = new List<KeyValuePair<string, List<RequestData.DemandView>>>
            {
                new KeyValuePair<string, List<RequestData.DemandView>>("1_5", new List<RequestData.DemandView>
                {
                    new RequestData.DemandView { Need = 3, Paid = 1, Count = "1/3", Item = 20372 },
                    new RequestData.DemandView { Need = 2, Paid = 2, Count = "2/2", Done = true },
                }),
            },
            Info = new List<PageJson.Info>
            {
                new PageJson.Info { Key = "5001", Sub = "Staple \"Rice\"", Uses = 7, Stats = new[] { 7.5f, -4f, 0f, 0f, 0f } },
                new PageJson.Info { Key = "L101", Uses = 10, Stats = new[] { 12.5f, 0f, 0f, 0f, 0f } },
            },
            Objects = new List<KeyValuePair<int, string>>
            {
                new KeyValuePair<int, string>(20372, "{\"id\":20372,\"n\":\"Electrical Wire\",\"r\":0,\"max\":3,\"qty\":0,\"tv\":12,\"demand\":false,\"category\":\"Material\",\"shelfLife\":\"\",\"des\":\"A coil of wire.\",\"icon\":\"wire.png\"}"),
            },
            Rewards = new List<KeyValuePair<string, List<RewardData.Item>>>
            {
                new KeyValuePair<string, List<RewardData.Item>>("1_5", new List<RewardData.Item> { new RewardData.Item { Id = 20372, Count = 2 } }),
            },
        };

        [Fact]
        public void DataJson_matches_the_fixture()
        {
            string json = PageJson.DataJson(FixtureData());

            var expected = JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "fixtures", "data.json")));
            Assert.True(JsonNode.DeepEquals(expected, JsonNode.Parse(json)), json);
        }

        [Fact]
        public void A_supply_cell_carries_its_kind_its_group_rank_and_no_tip()
        {
            var data = new PageJson.Data
            {
                Mode = "supply",
                Items = new List<PageJson.Cell>
                {
                    new PageJson.Cell { Id = 7, Number = 80, Kind = "sat", Order = 0 },
                    new PageJson.Cell { Id = 8, Dim = true, Order = 5 },
                },
                Medicine = 56,
            };

            var node = JsonNode.Parse(PageJson.DataJson(data));

            Assert.Equal("sat", (string)node["items"]["7"]["kind"]);
            Assert.Null(node["items"]["7"]["tip"]);
            Assert.True((bool)node["items"]["8"]["dim"]);
            Assert.Equal(5, (int)node["items"]["8"]["o"]);
            Assert.Equal(56, (int)node["medicine"]);
            Assert.Null(node["bar"]);
            Assert.Empty(node["header"]["wants"].AsArray());
        }

        [Fact]
        public void A_request_cell_names_each_request_demand_that_it_fills()
        {
            var data = new PageJson.Data
            {
                Mode = "request",
                Items = new List<PageJson.Cell>
                {
                    new PageJson.Cell
                    {
                        Id = 9,
                        Number = 5,
                        Demands = new List<PageJson.CellDemand>
                        {
                            new PageJson.CellDemand { Name = "Product", Add = 5 },
                            new PageJson.CellDemand { Name = "Product Types", Add = 1 },
                        },
                    },
                },
            };

            var demands = JsonNode.Parse(PageJson.DataJson(data))["items"]["9"]["demands"].AsArray();

            Assert.Equal(2, demands.Count);
            Assert.Equal("Product", (string)demands[0]["name"]);
            Assert.Equal(5, (int)demands[0]["add"]);
            Assert.Equal("Product Types", (string)demands[1]["name"]);
            Assert.Equal(1, (int)demands[1]["add"]);
        }

        [Fact]
        public void The_item_objects_of_the_game_go_to_the_page_as_they_are_by_config_id()
        {
            var data = new PageJson.Data { Mode = "request" };
            data.Objects.Add(new KeyValuePair<int, string>(20372, "{\"id\":20372,\"n\":\"Electrical Wire\",\"icon\":\"wire.png\"}"));

            var node = JsonNode.Parse(PageJson.DataJson(data))["objects"]["20372"];

            Assert.Equal("Electrical Wire", (string)node["n"]);
            Assert.Equal("wire.png", (string)node["icon"]);
        }

        [Fact]
        public void The_reward_items_of_each_row_go_to_the_page_by_row_key()
        {
            var data = new PageJson.Data { Mode = "request" };
            data.Rewards.Add(new KeyValuePair<string, List<RewardData.Item>>("4_1020", new List<RewardData.Item>
            {
                new RewardData.Item { Id = 2177, Count = 3 },
                new RewardData.Item { Id = 9032, Count = 1 },
            }));

            var row = JsonNode.Parse(PageJson.DataJson(data))["rewards"]["4_1020"].AsArray();

            Assert.Equal(2, row.Count);
            Assert.Equal(2177, (int)row[0]["id"]);
            Assert.Equal(3, (int)row[0]["count"]);
            Assert.Equal(9032, (int)row[1]["id"]);
            Assert.Equal(1, (int)row[1]["count"]);
        }

        [Fact]
        public void No_reward_gives_an_empty_map()
        {
            Assert.Empty(JsonNode.Parse(PageJson.DataJson(new PageJson.Data { Mode = "request" }))["rewards"].AsObject());
        }

        [Fact]
        public void A_cell_carries_its_config_id_and_its_expiry_for_the_value_order()
        {
            var data = new PageJson.Data { Mode = "trade", Items = new List<PageJson.Cell> { new PageJson.Cell { Id = 9, Number = 30, Cid = 2177, Exp = 1_500_000 } } };

            var cell = JsonNode.Parse(PageJson.DataJson(data))["items"]["9"];

            Assert.Equal(2177, (int)cell["cid"]);
            Assert.Equal(1_500_000L, (long)cell["exp"]);
        }

        [Fact]
        public void The_flag_of_the_request_demand_bars_goes_to_the_page()
        {
            Assert.True((bool)JsonNode.Parse(PageJson.DataJson(new PageJson.Data { Mode = "request", Bars = true }))["bars"]);
            Assert.False((bool)JsonNode.Parse(PageJson.DataJson(new PageJson.Data { Mode = "request" }))["bars"]);
        }

        [Fact]
        public void A_cell_with_no_request_demand_has_an_empty_list()
        {
            var data = new PageJson.Data { Mode = "trade", Items = new List<PageJson.Cell> { new PageJson.Cell { Id = 9, Number = 30 } } };

            Assert.Empty(JsonNode.Parse(PageJson.DataJson(data))["items"]["9"]["demands"].AsArray());
        }

        [Fact]
        public void The_data_of_no_mode_has_no_items()
        {
            var node = JsonNode.Parse(PageJson.DataJson(new PageJson.Data { Mode = "none" }));

            Assert.Equal("none", (string)node["mode"]);
            Assert.Empty(node["items"].AsObject());
            Assert.Empty(node["words"].AsObject());
        }

        [Theory]
        [InlineData(0.5f, "×½")]
        [InlineData(1.6f, "×1.6")]
        [InlineData(0.6f, "×0.6")]
        [InlineData(1.25f, "×1.25")]
        [InlineData(2f, "×2")]
        public void FactorText_writes_a_rate_as_a_factor(float rate, string expected)
        {
            Assert.Equal(expected, PageJson.FactorText(rate));
        }
    }

    public class PageCommandTests
    {
        private const string Json = "{\"mode\":\"none\"}";
        private const string Script = "window.__bettertrade = window.__bettertrade || {};";
        private const string NoScriptMessage = "window.vuplex.postMessage('slmod|bettertrade|no script')";

        [Fact]
        public void The_data_command_sends_only_the_data_and_posts_no_script_when_the_page_has_no_script()
        {
            Assert.Equal("window.__bettertrade?window.__bettertrade.setData(" + Json + "):" + NoScriptMessage, PageJson.SetDataCommand(Json));
            Assert.Equal("no script", PageJson.NoScript);
        }

        [Fact]
        public void The_apply_command_runs_one_pass_or_posts_no_script()
        {
            Assert.Equal("window.__bettertrade?window.__bettertrade.apply():" + NoScriptMessage, PageJson.ApplyCommand);
        }

        [Fact]
        public void The_full_command_is_the_script_then_the_data()
        {
            string js = PageJson.SetDataWithScriptCommand(Script, Json);

            Assert.StartsWith(Script, js);
            Assert.EndsWith(";window.__bettertrade.setData(" + Json + ");", js);
        }

        [Fact]
        public void The_full_command_with_no_data_is_the_script_alone()
        {
            Assert.Equal(Script + ";", PageJson.SetDataWithScriptCommand(Script, null));
        }

        [Fact]
        public void The_storage_command_runs_the_storage_pass_or_posts_no_script()
        {
            Assert.Equal("window.__bettertrade?window.__bettertrade.storage():" + NoScriptMessage, PageJson.StorageCommand);
        }

        [Fact]
        public void The_storage_pass_after_another_command_runs_only_when_the_page_has_the_script()
        {
            Assert.Equal(";window.__bettertrade&&window.__bettertrade.storage();", PageJson.StoragePass);
        }

        [Fact]
        public void The_message_prefix_names_the_mod()
        {
            Assert.Equal("slmod|bettertrade|", PageJson.MessagePrefix);
        }
    }
}
