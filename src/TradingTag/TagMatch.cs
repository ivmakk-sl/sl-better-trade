using System;
using System.Collections.Generic;
using GameCore.HotUpdate;
using GameCore.HotUpdate.Battle.Logic;
using HarmonyLib;
using Il2CppInterop.Runtime;
using Il2CppInterop.Runtime.InteropTypes;
using SlShared.ModTags;
using Il2CppList = Il2CppSystem.Collections.Generic.List<int>;
using Il2CppReadOnlyList = Il2CppSystem.Collections.Generic.IReadOnlyList<int>;

namespace BetterTrade
{
    // The game's tag logic sees each rule without the mod tags (ModTagRule.ForGame of the mod tags library), so the
    // trading tag does not change the robot rules: with other tags the storage works as with them alone, and alone it
    // gives an empty rule. A match of the tag itself would count as an option of the Supplies row.
    // Each path that matches a rule against an item goes through one of these three methods, as for Project Cook's
    // cooking tag. The Prefixes run before the ones of Project Cook (HarmonyBefore): the library rule removes each mod
    // tag, so the Prefix of Project Cook then sees no change. With an older Project Cook without the library, its
    // Prefix sees no cooking tag either, so no tag is lost.
    internal static class TagMatch
    {
        internal const string ProjectCook = "com.ivmakk.survivallog.projectcook";

        private static readonly HashSet<string> logged = new HashSet<string>();
        private static bool warned;

        // The rule for the game, or null when the rule has no mod tag to remove (the common case, with no allocation).
        public static Il2CppList ForGame(Il2CppObjectBase rule)
        {
            if (rule == null || TagRow.Disabled) return null;
            var list = rule.TryCast<Il2CppList>();
            if (list == null)
            {
                if (!warned)
                {
                    warned = true;
                    Plugin.Log.LogWarning($"Better Trade: a tag rule of type {rule.GetType().Name} is not a list, the trading tag can reach the game's tag logic.");
                }
                return null;
            }
            var count = list.Count;
            var any = false;
            for (var i = 0; i < count && !any; i++)
            {
                var id = list[i];
                any = id >= ModTagRule.RangeStart && id <= ModTagRule.RangeEnd;
            }
            if (!any) return null;
            var ids = new int[count];
            for (var i = 0; i < ids.Length; i++) ids[i] = list[i];
            var forGame = ModTagRule.ForGame(ids, TagRow.Taken);
            if (ReferenceEquals(forGame, ids)) return null;
            var result = new Il2CppList(forGame.Count);
            foreach (var id in forGame) result.Add(id);
            if (Plugin.Verbose.Value)
            {
                var text = $"trading tag rule {string.Join(",", ids)} -> {string.Join(",", forGame)}";
                if (logged.Add(text)) Plugin.Log.LogDebug(text);
            }
            return result;
        }

        public static void Warn(string where, Exception e)
        {
            if (warned) return;
            warned = true;
            Plugin.Log.LogWarning($"Better Trade: {where} failed, the trading tag can reach the game's tag logic: {e.Message}");
        }
    }

    [HarmonyPatch(typeof(FurnitureTagRules), "Evaluate")]
    internal static class TagMatchOnEvaluate
    {
        [HarmonyBefore(TagMatch.ProjectCook)]
        private static void Prefix(ref Il2CppReadOnlyList rule)
        {
            try
            {
                var forGame = TagMatch.ForGame(rule);
                if (forGame != null) rule = forGame.Cast<Il2CppReadOnlyList>();
            }
            catch (Exception e) { TagMatch.Warn("Evaluate", e); }
        }
    }

    [HarmonyPatch(typeof(FurnitureTagRules), nameof(FurnitureTagRules.TryGetMatchRank))]
    internal static class TagMatchOnTryGetMatchRank
    {
        [HarmonyBefore(TagMatch.ProjectCook)]
        private static void Prefix(ref Il2CppReadOnlyList rule)
        {
            try
            {
                var forGame = TagMatch.ForGame(rule);
                if (forGame != null) rule = forGame.Cast<Il2CppReadOnlyList>();
            }
            catch (Exception e) { TagMatch.Warn("TryGetMatchRank", e); }
        }
    }

    // TryGetPutRank reads the rule from TagIds of the component, so the Prefix swaps the list for the call and the
    // Finalizer puts the saved list back, also when the call throws. HarmonyX runs the Finalizers in the order of the
    // Prefixes, so HarmonyAfter makes this Finalizer the last: it puts back the original list after each other mod.
    [HarmonyPatch(typeof(FurnitureTagComponent), nameof(FurnitureTagComponent.TryGetPutRank))]
    internal static class TagMatchOnTryGetPutRank
    {
        [HarmonyBefore(TagMatch.ProjectCook)]
        private static void Prefix(FurnitureTagComponent __instance, out Il2CppList __state)
        {
            __state = null;
            try
            {
                var saved = __instance.TagIds;
                var forGame = TagMatch.ForGame(saved);
                if (forGame == null) return;
                __state = saved;
                __instance.TagIds = forGame;
            }
            catch (Exception e) { TagMatch.Warn("TryGetPutRank", e); }
        }

        [HarmonyAfter(TagMatch.ProjectCook)]
        private static void Finalizer(FurnitureTagComponent __instance, Il2CppList __state)
        {
            if (__state == null) return;
            try { __instance.TagIds = __state; }
            catch (Exception e) { Plugin.Log.LogError($"Better Trade: the tag rule of a storage could not be put back: {e}"); }
        }
    }
}
