using System;
using GameCore.HotUpdate;
using GameCore.HotUpdate.ReduxUI;

namespace BetterTrade
{
    // Opens the game's item detail popup for an offered item. A click on the icon of an offered row comes as a message
    // of the page script; the popup opens on the next frame tick, outside the message handler of the web view, with the
    // call of the Codex (a config id, no item instance).
    internal static class DetailPopup
    {
        private static int queued;

        public static void Queue(int configId)
        {
            if (configId > 0) queued = configId;
        }

        public static void Tick()
        {
            if (queued == 0) return;
            int configId = queued;
            queued = 0;
            try
            {
                Ac_ItemDetailPopup_OpenUI.SendAction(0, 0, configId, 1f, (TipsType)0, -1, 1f, 0, 0, 0f, 0f, 0f, 0f);
                if (Plugin.Verbose.Value) Plugin.Log.LogDebug($"Better Trade detail popup: {configId}");
            }
            catch (Exception e)
            {
                Plugin.Log.LogWarning($"Better Trade detail popup failed for {configId}: {e.Message}");
            }
        }
    }
}
