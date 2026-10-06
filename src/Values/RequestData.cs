using System.Collections.Generic;

namespace BetterTrade
{
    // The request demands of the rows of the delivery request list of Deliver Request. No game or BepInEx
    // type here.
    public static class RequestData
    {
        // One request demand of a row, as the game's DispDemand has it.
        public sealed class Demand
        {
            public int Need;
            public int Paid;
            public bool Done;
        }

        // What the page shows for one request demand at the right end of its bar: the count "paid/need", and whether
        // it is done.
        public sealed class DemandView
        {
            public int Need;
            public int Paid;
            public string Count;
            public bool Done;
            // The config id of the item of a request demand for one item; 0 for none.
            public int Item;
        }

        // The rows of the delivery request list whose game data the mod reads (the item lines and the reward): the aid
        // platform (row kind 1), and the radio aid delivery requests of the aid channel (row kind 4 with an id of 1000
        // and more; a smaller id is a neighbor commission).
        public enum RowSource { None, AidPlatform, AidChannel }

        public static RowSource SourceOf(int kind, int id) =>
            kind == 1 ? RowSource.AidPlatform : kind == 4 && id >= 1000 ? RowSource.AidChannel : RowSource.None;

        // The aid channel number of a radio aid delivery request row.
        public static int ChannelOf(int id) => id - 1000;

        // One line of the game data of a delivery request: an AidDemandSave of the aid platform (Kind 0 is one item),
        // or a DemandLine of the aid channel (Kind 0 is Item, with PickIds as a choice of items).
        public sealed class Line
        {
            public int Kind;
            public int ItemId;
            public int[] PickIds;
        }

        // The item of each request demand of a row, 0 for none. The lines and the request demands
        // (DispDemand) are in the same order, one line for each: a row whose line count differs (a kinds request
        // demand has one line for each candidate item) gets no item. A line gives its item only to a request demand of
        // kind 0, and only when it names one item. Only the aid platform (row kind 1) and the aid channel (row kind 4,
        // id 1000 and more) have lines that the mod reads.
        public static int[] ItemIds(int rowKind, int rowId, int[] demandKinds, IReadOnlyList<Line> lines)
        {
            var ids = new int[demandKinds.Length];
            if (SourceOf(rowKind, rowId) == RowSource.None || lines == null || lines.Count != demandKinds.Length) return ids;
            for (int i = 0; i < ids.Length; i++)
            {
                var l = lines[i];
                if (l == null || demandKinds[i] != 0 || l.Kind != 0 || l.ItemId <= 0) continue;
                if (l.PickIds != null && l.PickIds.Length > 0 && (l.PickIds.Length > 1 || l.PickIds[0] != l.ItemId)) continue;
                ids[i] = l.ItemId;
            }
            return ids;
        }

        public static List<DemandView> Demands(IReadOnlyList<Demand> demands)
        {
            var result = new List<DemandView>();
            foreach (var d in demands)
                result.Add(new DemandView
                {
                    Need = d.Need,
                    Paid = d.Paid,
                    Count = d.Paid + "/" + d.Need,
                    Done = d.Done || (d.Need > 0 && d.Paid >= d.Need),
                });
            return result;
        }
    }
}
