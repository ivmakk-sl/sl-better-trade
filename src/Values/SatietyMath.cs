namespace BetterTrade
{
    // The numbers of the satiety modes: Deliver Supplies (a neighbor or a camp) and the donation. Deliver Request takes
    // its numbers from the game's own drop check (DispatchCount).
    // The game's SupplyLevelRules.ConvertItem stays in the game-facing code; its result comes here.
    public static partial class TradeMath
    {
        // In the supply order of the value view: satiety, seed, material, medicine, fuel; None for an item that adds
        // nothing.
        public enum SupplyKind { Satiety, Seed, Material, Medicine, Fuel, None }

        public struct SupplyResult
        {
            public SupplyKind Kind;
            public int Amount;
        }

        private static readonly SupplyResult Nothing = new SupplyResult { Kind = SupplyKind.None, Amount = 0 };

        // What a stack adds to the supply of a neighbor: the result of ConvertItem, whose SupplyDim gives the kind
        // (0 satiety, 1 seed, 2 material, 3 fuel, 4 medicine).
        public static SupplyResult SupplyAmount(int dim, int value)
        {
            if (value <= 0) return Nothing;
            switch (dim)
            {
                case 0: return new SupplyResult { Kind = SupplyKind.Satiety, Amount = value };
                case 1: return new SupplyResult { Kind = SupplyKind.Seed, Amount = value };
                case 2: return new SupplyResult { Kind = SupplyKind.Material, Amount = value };
                case 3: return new SupplyResult { Kind = SupplyKind.Fuel, Amount = value };
                case 4: return new SupplyResult { Kind = SupplyKind.Medicine, Amount = value };
                default: return Nothing;
            }
        }

        // What a stack adds to a camp (Reducer_Web_TradeUI.CampGainOf): a fuel (category 13) its burn value times the
        // count; else the ConvertItem result when it is satiety or material; else nothing.
        public static SupplyResult CampGain(int category, int burnValue, int convertDim, int convertValue, int count)
        {
            if (category == 13)
            {
                int burn = burnValue > 0 ? burnValue * count : 0;
                return burn > 0 ? new SupplyResult { Kind = SupplyKind.Fuel, Amount = burn } : Nothing;
            }
            if (convertValue <= 0) return Nothing;
            if (convertDim == 0) return new SupplyResult { Kind = SupplyKind.Satiety, Amount = convertValue };
            if (convertDim == 2) return new SupplyResult { Kind = SupplyKind.Material, Amount = convertValue };
            return Nothing;
        }

        // The satiety of a stack in the donation (Reducer_Web_TradeUI.DonateSatietyOf): the raw uses (the uses left,
        // else the max uses, else the config uses), times the satiety of one use (the item's own, else the config's),
        // times the count.
        public static float DonateSatiety(int useTimes, int maxUseTimes, int cfgUses, float? instanceSatiety, float cfgSatiety, int count)
        {
            int uses = useTimes >= 1 ? useTimes : maxUseTimes >= 1 ? maxUseTimes : cfgUses >= 1 ? cfgUses : 1;
            float satiety = instanceSatiety ?? cfgSatiety;
            return (float)uses * satiety * (float)count;
        }

        // The rank of a kind in the value view of Deliver Supplies; an item that adds nothing comes last.
        public static int SupplyOrder(SupplyKind kind) => (int)kind;
    }
}
