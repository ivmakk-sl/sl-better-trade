using System;
using System.Collections.Generic;
using System.Linq;
using GameCore.HotUpdate;
using SlShared.I18n;

namespace BetterTrade
{
    // The mod texts (src/i18n/) through the i18n library: this adapter reads the display language and the game's text
    // of a text key, and writes the warnings of the library to the log. No other code of the mod reads the language.
    internal static class ModTexts
    {
        private const int English = 1;

        private static readonly I18nTexts texts = I18nTexts.Load(typeof(ModTexts).Assembly, "BetterTrade");
        private static readonly HashSet<string> loggedLanguages = new HashSet<string>();
        private static int warningsWritten;

        // The LanguageType number of the display language (Chinese = 0, English = 1), English before the config loads.
        public static int Language()
        {
            try
            {
                var cache = ConfigManager.Instance?.customCache;
                return cache != null ? (int)cache.LanguageType : English;
            }
            catch (Exception) { return English; }
        }

        // The mod texts in the display language, with the game's texts of the text keys. The language can change
        // while the game runs, so the texts are read again at each refresh.
        public static I18nTextSet Current()
        {
            int language = Language();
            var set = texts.For(language, GameText, ((LanguageType)language).ToString());
            if (Plugin.Verbose.Value && loggedLanguages.Add(set.Language))
            {
                var names = set.ToDictionary().Keys;
                Plugin.Log.LogDebug($"Better Trade texts: language={set.Language}, game texts: {string.Join(", ", set.GameTextNames)}; "
                    + $"file texts: {string.Join(", ", names.Except(set.GameTextNames))}");
            }
            WriteWarnings();
            return set;
        }

        // The mod texts of one language from the i18n files only, with no game text: for the text maps of a language
        // that is not the display language, and for a read before the game texts load.
        public static I18nTextSet For(int language)
        {
            var set = texts.For(language, null);
            WriteWarnings();
            return set;
        }

        // The name of a food subcategory; empty when the game has none. The game uses the subcategory numbers again in
        // the other categories, and names only those of food.
        public static string SubCategoryName(int subCategory) =>
            subCategory > 0 ? GameText("ItemSubCategory" + subCategory) ?? "" : "";

        // The game's text of a text key in the display language. The game's own key getters (GameKey.Text_*) use this
        // call. ConfigManager.GetLocalTxt does not take these keys.
        private static string GameText(string key)
        {
            try { return ConstantTextTools.ToConstantTextOrEmpty(key); }
            catch (Exception) { return null; }
        }

        private static void WriteWarnings()
        {
            var warnings = texts.Warnings;
            while (warningsWritten < warnings.Count) Plugin.Log.LogWarning("Better Trade: " + warnings[warningsWritten++]);
        }
    }
}
