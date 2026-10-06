using System;
using GameCore.HotUpdate.Battle.Show;
using HarmonyLib;
using UnityEngine;

namespace BetterTrade
{
    // The head bar above a storage shows a sprite for each tag (Assets/RuntimeAssets/Texture/UI/FurnitureTag/<IconKey>)
    // and tints it with the tag color (FurnitureHeadBar.ApplyTagRowSprite). The game has no sprite for the trading tag,
    // so the Prefix gives the sprite of the mod for its key: a white icon on a clear background. The game's load
    // would fail, with a Unity error and an entry in the game's GM log.
    // The icon is embedded as its alpha, one byte for each pixel, the bottom row first: the sprite data of the coin in the
    // icons library copy (Shared/icons/sprite/trade.alpha). ImageConversion.LoadImage cannot load a PNG here: each of its overloads in the
    // interop goes through Il2CppSystem.ReadOnlySpan, which fails at run time.
    [HarmonyPatch(typeof(FurnitureHeadBar), "LoadTagRowIcon")]
    internal static class HeadBarIcon
    {
        private const string Resource = "BetterTrade.trade-tag.alpha";

        private static Sprite sprite;
        private static bool warned;

        private static bool Prefix(string iconKey, ref Sprite __result)
        {
            if (iconKey != TradingTagLogic.IconKey) return true;
            __result = Get();
            return false;
        }

        // The sprite, built once and again when Unity destroyed it. Null when it cannot be built.
        private static Sprite Get()
        {
            if (sprite != null) return sprite;
            if (warned) return null;
            try
            {
                byte[] alpha;
                using (var stream = typeof(HeadBarIcon).Assembly.GetManifestResourceStream(Resource))
                using (var memory = new System.IO.MemoryStream())
                {
                    stream.CopyTo(memory);
                    alpha = memory.ToArray();
                }
                var size = (int)Math.Sqrt(alpha.Length);
                if (size * size != alpha.Length) throw new InvalidOperationException($"the icon has {alpha.Length} bytes, not a square");
                var texture = new Texture2D(size, size, TextureFormat.RGBA32, false);
                for (var y = 0; y < size; y++)
                    for (var x = 0; x < size; x++)
                        texture.SetPixel(x, y, new Color(1f, 1f, 1f, alpha[y * size + x] / 255f));
                texture.Apply(false, false);
                texture.hideFlags = HideFlags.DontUnloadUnusedAsset;
                sprite = Sprite.Create(texture, new Rect(0, 0, texture.width, texture.height), new Vector2(0.5f, 0.5f));
                sprite.hideFlags = HideFlags.DontUnloadUnusedAsset;
                if (Plugin.Verbose.Value) Plugin.Log.LogDebug($"trading tag head bar sprite built ({texture.width} x {texture.height})");
                return sprite;
            }
            catch (Exception e)
            {
                warned = true;
                Plugin.Log.LogWarning($"Better Trade: the head bar icon of the trading tag could not be built, the head bar shows the other tags: {e.Message}");
                return null;
            }
        }
    }
}
