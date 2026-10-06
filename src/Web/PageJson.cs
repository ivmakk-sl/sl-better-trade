using System.Collections.Generic;
using System.Globalization;
using System.Text;
using SlShared.Json;

namespace BetterTrade
{
    // The JSON text that the plugin sends to the page script, built by hand: netstandard2.1 has no
    // System.Text.Json, and the game's own Newtonsoft.Json is not usable from mod code. No game or BepInEx type
    // here. The page side of this shape is PageData in src/Web/page/types.ts.
    public static class PageJson
    {
        // One part of the value of a cell: a rate ("×½") and why it applies ("half", "wanted", "appraisal", "sell").
        public sealed class Factor
        {
            public string X;
            public string Why;
        }

        // The parts of the trade value of a cell, for its tooltip line: tv x count x uses, then the factors.
        public sealed class Tip
        {
            public int TradeValue;
            public int Count;
            public float Uses;
            public List<Factor> Factors = new List<Factor>();
        }

        // The number of one cell of the storage grid or the drone, by the logic id of its item.
        public sealed class Cell
        {
            public long Id;
            public int Number;
            // The factor class of a trade: "full", "low", "wanted"; empty in the other modes.
            public string Class;
            // The supply kind: "sat", "seed", "mat", "med", "fuel"; empty outside Deliver Supplies.
            public string Kind;
            // A cell that adds nothing: dimmed, with no number.
            public bool Dim;
            // The group rank of the value view (the supply order in Deliver Supplies, else 0).
            public int Order;
            // The parts of the trade value, in a trade only.
            public Tip Tip;
            // Each request demand that the cell fills, in the game's order, in Deliver Request only.
            public List<CellDemand> Demands = new List<CellDemand>();
            // The key of the tooltip lines of the cell in Info; empty for none.
            public string InfoKey;
            // The config id and the expiry moment (0 for an item that does not spoil), for the value order.
            public int Cid;
            public long Exp;
        }

        // A request demand that a cell fills: its label and what the stack adds to it.
        public sealed class CellDemand
        {
            public string Name;
            public int Add;
        }

        // The offer, the goods, and the deal line, as whole numbers. Picked is false before any pick.
        public sealed class Bar
        {
            public int Offer;
            public int Goods;
            public int DealLine;
            public bool Picked;
        }

        // A category of the header with its factor ("Medicine", "×1.6").
        public sealed class Group
        {
            public string Name;
            public string X;
        }

        // The tooltip lines of an item: the subcategory, the config uses, the five stats of one use (Satiety, Morale,
        // Stamina, Health, Life), the effect of a book, and the crop of a seed. The key is the config id, or "L" and the
        // logic id for an item with its own stats (a cooked dish).
        public sealed class Info
        {
            public string Key;
            public string Sub;
            public int Uses;
            public float[] Stats;
            public string Read;
            public string Crop;
        }

        // The data of setData. Mode is "trade", "supply", "camp", "donate", "request", or "none" (the mod shows
        // nothing).
        public sealed class Data
        {
            public string Mode;
            public List<KeyValuePair<string, string>> Words = new List<KeyValuePair<string, string>>();
            public List<Cell> Items = new List<Cell>();
            // The value of one offered unit, by config id.
            public List<KeyValuePair<int, int>> Shelf = new List<KeyValuePair<int, int>>();
            public Bar Bar;
            public List<Group> Wants = new List<Group>();
            public List<Group> Half = new List<Group>();
            // The medicine total of the drone in Deliver Supplies to a neighbor; null in the other cases.
            public int? Medicine;
            // The request demand bars of the delivery request list are on (config entry DeliveryRequestList).
            public bool Bars;
            // The request demands of each row of the delivery request list, by the row key "<kind>_<id>"; empty with
            // the bars off.
            public List<KeyValuePair<string, List<RequestData.DemandView>>> Requests = new List<KeyValuePair<string, List<RequestData.DemandView>>>();
            public List<Info> Info = new List<Info>();
            // The item objects of the game's tooltip (Reducer_Web_TradeUI.AppendShelfJson), by config id, as the JSON
            // text that the game built: for the item request demands and the delivery request rewards.
            public List<KeyValuePair<int, string>> Objects = new List<KeyValuePair<int, string>>();
            // The delivery request reward of each row of the delivery request list, by the row key "<kind>_<id>";
            // empty with the rewards off (config entry DeliveryRequestRewards).
            public List<KeyValuePair<string, List<RewardData.Item>>> Rewards = new List<KeyValuePair<string, List<RewardData.Item>>>();
        }

        public static string DataJson(Data d)
        {
            var sb = new StringBuilder();
            sb.Append("{\"mode\":").AppendStr(d.Mode);

            sb.Append(",\"words\":{");
            for (int i = 0; i < d.Words.Count; i++)
            {
                if (i > 0) sb.Append(',');
                sb.AppendStr(d.Words[i].Key).Append(':').AppendStr(d.Words[i].Value);
            }
            sb.Append('}');

            sb.Append(",\"items\":{");
            for (int i = 0; i < d.Items.Count; i++)
            {
                if (i > 0) sb.Append(',');
                AppendCell(sb, d.Items[i]);
            }
            sb.Append('}');

            sb.Append(",\"shelf\":{");
            for (int i = 0; i < d.Shelf.Count; i++)
            {
                if (i > 0) sb.Append(',');
                sb.Append('"').Append(JsonText.Num(d.Shelf[i].Key)).Append("\":").Append(JsonText.Num(d.Shelf[i].Value));
            }
            sb.Append('}');

            sb.Append(",\"bar\":");
            if (d.Bar == null) sb.Append("null");
            else
                sb.Append("{\"offer\":").Append(JsonText.Num(d.Bar.Offer))
                    .Append(",\"goods\":").Append(JsonText.Num(d.Bar.Goods))
                    .Append(",\"dealLine\":").Append(JsonText.Num(d.Bar.DealLine))
                    .Append(",\"picked\":").Append(d.Bar.Picked ? "true" : "false")
                    .Append('}');

            sb.Append(",\"header\":{\"wants\":");
            AppendGroups(sb, d.Wants);
            sb.Append(",\"half\":");
            AppendGroups(sb, d.Half);
            sb.Append('}');

            sb.Append(",\"medicine\":").Append(d.Medicine.HasValue ? d.Medicine.Value.ToString(CultureInfo.InvariantCulture) : "null");

            sb.Append(",\"bars\":").Append(d.Bars ? "true" : "false");

            sb.Append(",\"requests\":{");
            for (int i = 0; i < d.Requests.Count; i++)
            {
                if (i > 0) sb.Append(',');
                sb.AppendStr(d.Requests[i].Key).Append(":[");
                var list = d.Requests[i].Value;
                for (int j = 0; j < list.Count; j++)
                {
                    if (j > 0) sb.Append(',');
                    sb.Append("{\"need\":").Append(JsonText.Num(list[j].Need))
                        .Append(",\"paid\":").Append(JsonText.Num(list[j].Paid))
                        .Append(",\"count\":").AppendStr(list[j].Count)
                        .Append(",\"done\":").Append(list[j].Done ? "true" : "false")
                        .Append(",\"item\":").Append(JsonText.Num(list[j].Item))
                        .Append('}');
                }
                sb.Append(']');
            }
            sb.Append('}');

            sb.Append(",\"info\":{");
            for (int i = 0; i < d.Info.Count; i++)
            {
                if (i > 0) sb.Append(',');
                AppendInfo(sb, d.Info[i]);
            }
            sb.Append('}');

            sb.Append(",\"objects\":{");
            for (int i = 0; i < d.Objects.Count; i++)
            {
                if (i > 0) sb.Append(',');
                sb.Append('"').Append(JsonText.Num(d.Objects[i].Key)).Append("\":").Append(d.Objects[i].Value);
            }
            sb.Append('}');

            sb.Append(",\"rewards\":{");
            for (int i = 0; i < d.Rewards.Count; i++)
            {
                if (i > 0) sb.Append(',');
                sb.AppendStr(d.Rewards[i].Key).Append(":[");
                var list = d.Rewards[i].Value;
                for (int j = 0; j < list.Count; j++)
                {
                    if (j > 0) sb.Append(',');
                    sb.Append("{\"id\":").Append(JsonText.Num(list[j].Id)).Append(",\"count\":").Append(JsonText.Num(list[j].Count)).Append('}');
                }
                sb.Append(']');
            }
            sb.Append("}}");
            return sb.ToString();
        }

        private static void AppendCell(StringBuilder sb, Cell c)
        {
            sb.Append('"').Append(JsonText.Num(c.Id)).Append("\":{\"n\":").Append(JsonText.Num(c.Number))
                .Append(",\"cls\":").AppendStr(c.Class)
                .Append(",\"kind\":").AppendStr(c.Kind)
                .Append(",\"dim\":").Append(c.Dim ? "true" : "false")
                .Append(",\"o\":").Append(JsonText.Num(c.Order))
                .Append(",\"tip\":");
            if (c.Tip == null) sb.Append("null");
            else
            {
                sb.Append("{\"tv\":").Append(JsonText.Num(c.Tip.TradeValue))
                    .Append(",\"count\":").Append(JsonText.Num(c.Tip.Count))
                    .Append(",\"uses\":").Append(JsonText.Num(c.Tip.Uses))
                    .Append(",\"f\":[");
                for (int i = 0; i < c.Tip.Factors.Count; i++)
                {
                    if (i > 0) sb.Append(',');
                    sb.Append("{\"x\":").AppendStr(c.Tip.Factors[i].X).Append(",\"why\":").AppendStr(c.Tip.Factors[i].Why).Append('}');
                }
                sb.Append("]}");
            }
            sb.Append(",\"demands\":[");
            for (int i = 0; i < c.Demands.Count; i++)
            {
                if (i > 0) sb.Append(',');
                sb.Append("{\"name\":").AppendStr(c.Demands[i].Name).Append(",\"add\":").Append(JsonText.Num(c.Demands[i].Add)).Append('}');
            }
            sb.Append("],\"info\":").AppendStr(c.InfoKey)
                .Append(",\"cid\":").Append(JsonText.Num(c.Cid))
                .Append(",\"exp\":").Append(JsonText.Num(c.Exp)).Append('}');
        }

        private static void AppendGroups(StringBuilder sb, List<Group> groups)
        {
            sb.Append('[');
            for (int i = 0; i < groups.Count; i++)
            {
                if (i > 0) sb.Append(',');
                sb.Append("{\"name\":").AppendStr(groups[i].Name).Append(",\"x\":").AppendStr(groups[i].X).Append('}');
            }
            sb.Append(']');
        }

        private static void AppendInfo(StringBuilder sb, Info info)
        {
            sb.AppendStr(info.Key).Append(":{\"sub\":").AppendStr(info.Sub)
                .Append(",\"uses\":").Append(JsonText.Num(info.Uses))
                .Append(",\"stats\":[");
            var stats = info.Stats ?? new float[5];
            for (int i = 0; i < stats.Length; i++)
            {
                if (i > 0) sb.Append(',');
                sb.Append(JsonText.Num(stats[i]));
            }
            sb.Append("],\"read\":").AppendStr(info.Read)
                .Append(",\"crop\":").AppendStr(info.Crop).Append('}');
        }

        // A rate as the page shows it: "×½" for one half, else "×" and the rate with at most two decimals.
        public static string FactorText(float rate) =>
            rate == 0.5f ? "×½" : "×" + JsonText.Num(rate);

        // The prefix of each message from the page script to the plugin (window.vuplex.postMessage).
        public const string MessagePrefix = "slmod|bettertrade|";

        // The message text when the root page has no page script: a new root page, or one that the game built again
        // after a browser crash.
        public const string NoScript = "no script";

        // Each command has no result callback: the page answers only by message, and a root page with no script
        // posts NoScript.
        private const string NoScriptMessage = "window.vuplex.postMessage('" + MessagePrefix + NoScript + "')";

        // The push of the data when the page script is already in the root page.
        public static string SetDataCommand(string json) =>
            "window.__bettertrade?window.__bettertrade.setData(" + json + "):" + NoScriptMessage;

        // One pass with the stored data, when the data did not change.
        public const string ApplyCommand = "window.__bettertrade?window.__bettertrade.apply():" + NoScriptMessage;

        // The page script, then the push of the data: sent only after a NoScript message. With no data (the trade
        // window is closed), the script alone.
        public static string SetDataWithScriptCommand(string script, string json) =>
            json == null ? script + ";" : script + ";window.__bettertrade.setData(" + json + ");";

        // The storage pass alone, when the storage window is ready.
        public const string StorageCommand = "window.__bettertrade?window.__bettertrade.storage():" + NoScriptMessage;

        // The storage pass after another command: it runs only when the page has the script, because the command
        // before it already posts NoScript.
        public const string StoragePass = ";window.__bettertrade&&window.__bettertrade.storage();";
    }
}
