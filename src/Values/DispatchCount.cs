using System.Collections.Generic;

namespace BetterTrade
{
    // The number and the dim of a cell in Deliver Request, from two takes of the game's drop check
    // (Reducer_Web_TradeUI.CollectDispatchTake): the Add of each request demand without the stack of the cell and
    // with it. A storage cell compares the drone cargo with the drone cargo plus the cell; a drone cell compares the
    // drone cargo without the cell with the drone cargo. No game or BepInEx type here.
    public static class DispatchCount
    {
        // What a stack adds to one request demand, by its index in the game's order.
        public sealed class Part
        {
            public int Demand;
            public int Add;
        }

        public sealed class Result
        {
            // What the stack adds to the first request demand that grew; 0 for a dimmed cell.
            public int Number;
            public bool Dim;
            public List<Part> Parts = new List<Part>();
        }

        // without, with: the Add of each request demand. with is null for a stack with no hint of the selected
        // delivery request, which the game refuses before any rule. accepted: the stack is in the Accepted set of the
        // take with it.
        public static Result Of(int[] without, int[] with, bool accepted)
        {
            var r = new Result { Dim = true };
            if (!accepted || without == null || with == null || without.Length != with.Length) return r;
            for (int i = 0; i < with.Length; i++)
            {
                int grow = with[i] - without[i];
                if (grow > 0) r.Parts.Add(new Part { Demand = i, Add = grow });
            }
            if (r.Parts.Count == 0) return r;
            r.Number = r.Parts[0].Add;
            r.Dim = false;
            return r;
        }
    }
}
