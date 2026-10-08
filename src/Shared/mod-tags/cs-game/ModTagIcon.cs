// Library copy of shared/mod-tags 1.1.0. Do not edit: see src/Shared/mod-tags/VERSION.
using System;
using System.Reflection;
using GameCore.HotUpdate.Battle.Show;
using HarmonyLib;
using UnityEngine;

namespace SlShared.ModTags
{
    // The head bar icon of the mod tag of one mod. The head bar above a storage shows a sprite for each tag
    // (ModTagRule.IconAssetPath) and tints it with the tag color (FurnitureHeadBar.ApplyTagRowSprite). The game has no
    // sprite for a mod tag, so the patches give the sprite of the mod for its key: a white icon on a clear background.
    // The game's load would fail, with a Unity error and an entry in the game's GM log.
    // The icon is embedded in the mod as its alpha, one byte for each pixel, the bottom row first.
    // ImageConversion.LoadImage cannot load a PNG here: each of its overloads in the interop goes through
    // Il2CppSystem.ReadOnlySpan, which fails at run time.
    // Each mod has its own copy of this class, so each mod sets it up for its own key in Load, before its patches.
    internal static class ModTagIcon
    {
        private static string iconKey;
        private static Assembly assembly;
        private static string resource;
        private static Action<string> warn;
        private static Action<string> debug;

        private static Sprite sprite;
        private static bool warned;

        // iconKey: the IconKey of the tag row of the mod. resource: the LogicalName of the embedded alpha file.
        // warn: a warning to the log of the mod. debug: a debug line, which the mod writes only when Verbose is on.
        internal static void Setup(string iconKey, Assembly assembly, string resource, Action<string> warn, Action<string> debug)
        {
            ModTagIcon.iconKey = iconKey;
            ModTagIcon.assembly = assembly;
            ModTagIcon.resource = resource;
            ModTagIcon.warn = warn;
            ModTagIcon.debug = debug;
        }

        internal static string IconKey => iconKey;

        internal static void Debug(string text) => debug?.Invoke(text);

        internal static void Warn(string text) => warn?.Invoke(text);

        // The sprite, built once and again when Unity destroyed it. Null when it cannot be built.
        internal static Sprite Get()
        {
            if (sprite != null) return sprite;
            if (warned) return null;
            try
            {
                byte[] alpha;
                using (var stream = assembly.GetManifestResourceStream(resource))
                using (var memory = new System.IO.MemoryStream())
                {
                    if (stream == null) throw new InvalidOperationException($"the mod has no embedded resource '{resource}'");
                    stream.CopyTo(memory);
                    alpha = memory.ToArray();
                }
                var size = ModTagRule.AlphaSide(alpha.Length);
                var texture = new Texture2D(size, size, TextureFormat.RGBA32, false);
                for (var y = 0; y < size; y++)
                    for (var x = 0; x < size; x++)
                        texture.SetPixel(x, y, new Color(1f, 1f, 1f, alpha[y * size + x] / 255f));
                texture.Apply(false, false);
                texture.hideFlags = HideFlags.DontUnloadUnusedAsset;
                sprite = Sprite.Create(texture, new Rect(0, 0, texture.width, texture.height), new Vector2(0.5f, 0.5f));
                sprite.hideFlags = HideFlags.DontUnloadUnusedAsset;
                debug?.Invoke($"tag '{iconKey}' head bar sprite built ({texture.width} x {texture.height})");
                return sprite;
            }
            catch (Exception e)
            {
                warned = true;
                warn?.Invoke($"the head bar icon of the tag '{iconKey}' could not be built, the head bar shows the other tags: {e.Message}");
                return null;
            }
        }
    }

    // The game loads the head bar sprite of a tag by its key. For the key of the mod, the Prefix gives the sprite of
    // the mod and skips the game's load.
    [HarmonyPatch(typeof(FurnitureHeadBar), "LoadTagRowIcon")]
    internal static class ModTagIconLoad
    {
        private static bool Prefix(string iconKey, ref Sprite __result)
        {
            if (ModTagIcon.IconKey == null || iconKey != ModTagIcon.IconKey) return true;
            __result = ModTagIcon.Get();
            return false;
        }
    }

    // The asset preload of a save load adds the icon path of each row of the tag table (PreloadTagRowIcons). The mod
    // adds its row at the first load of a game run, after that preload, and the row stays in the table. So each later
    // load in the same game run preloaded the path of the mod's key, which has no asset, and the game logged a warning
    // and an error. The Postfix takes that path out of the preload map. The head bar gets its sprite from
    // ModTagIconLoad in any case. A failure warns once and leaves the map of the game as it is, so the save load goes
    // on with the old warning and error at most.
    [HarmonyPatch(typeof(FurnitureHeadBar), nameof(FurnitureHeadBar.PreloadTagRowIcons))]
    internal static class ModTagIconPreload
    {
        private static bool warned;

        private static void Postfix(Il2CppSystem.Collections.Generic.Dictionary<string, GameCore.HotUpdate.Battle.PreLoaderData> map)
        {
            try
            {
                if (map == null || ModTagIcon.IconKey == null) return;
                var path = ModTagRule.IconAssetPath(ModTagIcon.IconKey);
                if (map.Remove(path)) ModTagIcon.Debug("tag icon preload removed: " + path);
            }
            catch (Exception e)
            {
                if (warned) return;
                warned = true;
                ModTagIcon.Warn($"the icon of the tag '{ModTagIcon.IconKey}' could not be taken out of the asset preload, a later save load can log an error for it: {e.Message}");
            }
        }
    }
}
