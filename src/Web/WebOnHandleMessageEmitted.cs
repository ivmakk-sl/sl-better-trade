using System;
using System.Collections.Generic;
using HarmonyLib;
using Vuplex.WebView.Internal;

namespace BetterTrade
{
    // The messages of the page script (window.vuplex.postMessage('slmod|bettertrade|<text>')). The Prefix takes only
    // the messages with the prefix of this mod, so the game's handler and the other mods never get them, and lets
    // each other message through. The texts: "no script", "no TradeUI frame", and "no storage frame" go to the push
    // schedule, "detail:<config id>" opens the item detail popup, "missing: ...", "error: ...", and the missing part
    // of the storage pass ("storage: missing ...") log one warning each. "storage: installed" shows only in the
    // Verbose line of each message.
    [HarmonyPatch(typeof(BaseWebView), "HandleMessageEmitted")]
    internal static class WebOnHandleMessageEmitted
    {
        private static readonly HashSet<string> logged = new HashSet<string>();

        private static bool Prefix(string serializedMessage)
        {
            if (serializedMessage == null || !serializedMessage.StartsWith(PageJson.MessagePrefix, StringComparison.Ordinal))
                return true;
            try
            {
                string text = serializedMessage.Substring(PageJson.MessagePrefix.Length);
                if (Plugin.Verbose.Value) Plugin.Log.LogDebug($"Better Trade message: {text}");
                const string detail = "detail:";
                if (text.StartsWith(detail, StringComparison.Ordinal))
                {
                    if (int.TryParse(text.Substring(detail.Length), out int configId)) DetailPopup.Queue(configId);
                }
                else if (text.StartsWith("missing: ", StringComparison.Ordinal) || text.StartsWith("error: ", StringComparison.Ordinal)
                         || text.StartsWith("storage: missing ", StringComparison.Ordinal))
                {
                    if (logged.Add(text)) Plugin.Log.LogWarning($"Better Trade page: {text}");
                }
                else PageTick.OnMessage(text);
            }
            catch (Exception e)
            {
                if (logged.Add(e.Message)) Plugin.Log.LogWarning($"Better Trade message failed: {e}");
            }
            return false;
        }
    }
}
