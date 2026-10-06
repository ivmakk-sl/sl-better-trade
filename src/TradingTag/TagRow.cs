using System;
using System.Collections.Generic;
using GameCore.HotUpdate;
using HarmonyLib;
using SlShared.ModTags;

namespace BetterTrade
{
    // Adds the trading tag to the game's tag table and its words to the game's text maps, as Project Cook does for the
    // cooking tag. FurnitureTagRules.EnsureCache copies _Config_FurnitureTag_Dict into its own cache once for each
    // ConfigManager.customCache, and each read of the tag rule (the rule window, Sanitize at load, each match) calls it
    // first. So the row is in the table before the game's first use of it, and Sanitize keeps the saved id.
    // The names resolve with ConfigManager.GetLocalTxt, which reads customCache.LanguageMap, so the two keys go into
    // that map. EnsureCache runs for each match of the robot, so the Prefix does its work only when the customCache
    // object or the display language changes.
    // The row has the keys of the mod tags library, so a game row with the id 1901 differs from it. When the game took
    // the id, the mod adds no row and Disabled turns off the rule swap and the tabs.
    [HarmonyPatch(typeof(FurnitureTagRules), "EnsureCache")]
    internal static class TagRow
    {
        private static IntPtr lastCache;
        private static int lastLanguage = -1;
        private static bool failed, warnedTaken;

        // The ids of the range that the game took, read from the table before the row is added.
        internal static HashSet<int> Taken = new HashSet<int>();
        internal static bool Disabled;

        private static void Prefix()
        {
            if (failed) return;
            try
            {
                var config = ConfigManager.Instance;
                var cache = config?.customCache;
                if (cache == null) return;
                var language = ModTexts.Language();
                if (cache.Pointer == lastCache && language == lastLanguage) return;
                lastCache = cache.Pointer;
                lastLanguage = language;

                var table = config._Config_FurnitureTag_Dict;
                if (table == null) return;
                var rows = Rows(table);
                Taken = ModTagRule.TakenIds(rows);
                Disabled = !ModTagRule.CanAdd(ModTagRule.TradingTagId, rows);
                if (Disabled)
                {
                    if (!warnedTaken)
                    {
                        warnedTaken = true;
                        Plugin.Log.LogWarning($"Better Trade: the game uses the tag id {ModTagRule.TradingTagId} for a tag of its own, so the trading tag is off.");
                    }
                    return;
                }

                // The texts come from the i18n files only: the Prefix can run early in a save load, before the game texts.
                var words = TradingTagLogic.WordsFrom(ModTexts.For(language));
                SetText(cache.LanguageMap, words);
                SetText(cache.ChineseLanguageMap, TradingTagLogic.WordsFrom(ModTexts.For(0)));
                SetText(cache.EnglishLanguageMap, TradingTagLogic.WordsFrom(ModTexts.For(1)));

                if (table.ContainsKey(ModTagRule.TradingTagId)) return;
                table[ModTagRule.TradingTagId] = new Config_FurnitureTag
                {
                    ID = ModTagRule.TradingTagId,
                    TagName = ModTagRule.NameKey(ModTagRule.TradingTagId),
                    TagName_Local = words.Name,
                    TagDesc = ModTagRule.DescKey(ModTagRule.TradingTagId),
                    TagDesc_Local = words.Desc,
                    IconKey = TradingTagLogic.IconKey,
                    Color = TradingTagLogic.Color,
                    SortPriority = TradingTagLogic.SortPriority,
                    Dim = TradingTagLogic.Dim,
                    Order = TradingTagLogic.Order,
                };
                // The cache of the tag rules was built without the row: a null token makes EnsureCache build it again.
                var wasBuilt = FurnitureTagRules._cacheToken != null;
                FurnitureTagRules._cacheToken = null;
                if (Plugin.Verbose.Value)
                    Plugin.Log.LogDebug($"trading tag row added, taken ids: {(Taken.Count == 0 ? "none" : string.Join(",", Taken))} (cache cleared: {wasBuilt})");
            }
            catch (Exception e)
            {
                failed = true;
                Disabled = true;
                Plugin.Log.LogWarning($"Better Trade: the trading tag could not be added, the tag rule shows only the other tags: {e.Message}");
            }
        }

        // The (id, name key) pairs of the game's tag table.
        private static List<ModTagRule.Row> Rows(Il2CppSystem.Collections.Generic.Dictionary<int, Config_FurnitureTag> table)
        {
            var rows = new List<ModTagRule.Row>(table.Count);
            var e = table.GetEnumerator();
            while (e.MoveNext())
            {
                var row = e.Current.Value;
                rows.Add(new ModTagRule.Row(e.Current.Key, row?.TagName));
            }
            return rows;
        }

        private static void SetText(Il2CppSystem.Collections.Generic.Dictionary<string, string> map, TradingTagLogic.Words words)
        {
            if (map == null) return;
            map[ModTagRule.NameKey(ModTagRule.TradingTagId)] = words.Name;
            map[ModTagRule.DescKey(ModTagRule.TradingTagId)] = words.Desc;
        }
    }
}
