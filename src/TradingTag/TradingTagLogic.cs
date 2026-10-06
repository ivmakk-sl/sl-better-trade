using System.Collections.Generic;
using SlShared.I18n;
using SlShared.ModTags;

namespace BetterTrade
{
    // Game-free logic of the trading tag. This file must not use any game or BepInEx type, because the unit tests
    // compile it alone.
    public static class TradingTagLogic
    {
        // The row of the game's FurnitureTag table that the mod adds, with the id ModTagRule.TradingTagId and the keys
        // of the mod tags library. Dim 0 is the Supplies row, Order 520 puts it after Misc (510), and SortPriority is
        // the value of the other Supplies tags (unused: the game's tag logic never sees the id). The color is the gold
        // of the trade value (--bt-gold).
        public const int Dim = 0, Order = 520, SortPriority = 4;
        public const string Color = "#FBB034", IconKey = "trade";

        public readonly struct Words
        {
            public readonly string Name, Desc;
            public Words(string name, string desc) { Name = name; Desc = desc; }
        }

        public readonly struct Storage
        {
            public readonly long OwnerId;
            public readonly int ConfigId;
            public Storage(long ownerId, int configId) { OwnerId = ownerId; ConfigId = configId; }
        }

        // The name and the description of the tag, from the mod texts of one language.
        internal static Words WordsFrom(I18nTextSet texts) => new Words(texts["tradingTagName"], texts["tradingTagDesc"]);

        // A storage is a trade storage with the trading tag.
        public static bool LinksToTrading(IEnumerable<int> tagIds)
        {
            foreach (var id in tagIds)
                if (id == ModTagRule.TradingTagId) return true;
            return false;
        }

        // The tabs that the trading tag adds after the game's tabs: each tagged storage whose owner id is not in the
        // game's list (a fridge, a tool cabinet, the docked hub), in owner id order, as the game sorts its own list.
        public static List<Storage> ExtraTabs(IReadOnlyList<long> gameOwners, IReadOnlyList<Storage> tagged)
        {
            var listed = new HashSet<long>(gameOwners);
            var tabs = new List<Storage>();
            foreach (var s in tagged)
                if (!listed.Contains(s.OwnerId)) tabs.Add(s);
            tabs.Sort((a, b) => a.OwnerId.CompareTo(b.OwnerId));
            return tabs;
        }
    }
}
