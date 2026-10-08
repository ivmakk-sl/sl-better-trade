// Library copy of shared/mod-tags 1.1.0. Do not edit: see src/Shared/mod-tags/VERSION.
using System.Collections.Generic;

namespace SlShared.ModTags
{
    // The one rule of all mod tags: a tag that a mod adds to the game's tag rule. The game's tag logic knows no mod
    // tag, so each mod gives the game the rule without the mod tags. Each value here is a contract between mods and
    // between library versions: an id is kept in the save, so it never changes.
    internal static class ModTagRule
    {
        // The ids of the mod tags. The game's ids are 1001-1032 in 1.1.18293.
        public const int RangeStart = 1900, RangeEnd = 1999;

        // Project Cook's cooking tag and Better Trade's trading tag. A new mod tag takes the next free id.
        public const int CookingTagId = 1900, TradingTagId = 1901;

        // The game's tag Food. The cooking tag alone gives this rule, so the robot puts food in the storage. This is
        // fixed to the cooking tag, so it cannot differ between library versions.
        public const int FoodTagId = 1001;

        // The name key of a mod row starts with this prefix and a game row's key does not, so a mod row and a game
        // row with the same id differ. The keys live only in the text maps at run time; the save keeps the ids.
        public const string ModKeyPrefix = "SlModTag_";

        public static string NameKey(int id) => ModKeyPrefix + "TagName_" + id;
        public static string DescKey(int id) => ModKeyPrefix + "TagDesc_" + id;

        // A row of the game's tag table: its id and its name key.
        public readonly struct Row
        {
            public readonly int Id;
            public readonly string NameKey;
            public Row(int id, string nameKey) { Id = id; NameKey = nameKey; }
        }

        // The ids of the range that the game took: a row with a name key without the mod prefix.
        public static HashSet<int> TakenIds(IEnumerable<Row> rows)
        {
            var taken = new HashSet<int>();
            foreach (var r in rows)
                if (r.Id >= RangeStart && r.Id <= RangeEnd && !IsModKey(r.NameKey)) taken.Add(r.Id);
            return taken;
        }

        // Whether a mod can use the id for its mod tag: the table has no row with it, or a mod row (its own row, or
        // the row of another mod).
        public static bool CanAdd(int id, IEnumerable<Row> rows)
        {
            foreach (var r in rows)
                if (r.Id == id && !IsModKey(r.NameKey)) return false;
            return true;
        }

        // The asset path of the head bar icon of a tag key: the path that the game builds in
        // FurnitureHeadBar.LoadTagRowIcon and adds to the asset preload in FurnitureHeadBar.PreloadTagRowIcons.
        public static string IconAssetPath(string iconKey) => "Assets/RuntimeAssets/Texture/UI/FurnitureTag/" + iconKey;

        // The side of a square icon from its alpha data (one byte for each pixel).
        public static int AlphaSide(int byteCount)
        {
            var side = (int)System.Math.Sqrt(byteCount);
            if (side < 1 || side * side != byteCount)
                throw new System.InvalidOperationException($"the icon has {byteCount} bytes, not a square");
            return side;
        }

        private static bool IsModKey(string key) =>
            key != null && key.StartsWith(ModKeyPrefix, System.StringComparison.Ordinal);

        // The rule that the game's tag logic sees: the rule without each id of the range that the game did not take
        // (takenIds). A rule with no id to remove comes back as the same object, so a second mod that applies the
        // rule to the result changes nothing.
        public static IReadOnlyList<int> ForGame(IReadOnlyList<int> rule, ICollection<int> takenIds)
        {
            var at = -1;
            for (var i = 0; i < rule.Count; i++)
                if (Removable(rule[i], takenIds)) { at = i; break; }
            if (at < 0) return rule;
            var result = new List<int>(rule.Count);
            var hadCooking = false;
            for (var i = 0; i < rule.Count; i++)
            {
                if (!Removable(rule[i], takenIds)) result.Add(rule[i]);
                else if (rule[i] == CookingTagId) hadCooking = true;
            }
            if (result.Count == 0 && hadCooking) result.Add(FoodTagId);
            return result;
        }

        private static bool Removable(int id, ICollection<int> takenIds) =>
            id >= RangeStart && id <= RangeEnd && !takenIds.Contains(id);
    }
}
