using System;
using System.Collections.Generic;
using GameCore.HotUpdate.ReduxUI;
using HarmonyLib;
using Il2CppInterop.Runtime;
using UnityEngine;

namespace BetterTrade
{
    // The per-frame hook: opens a queued item detail popup, then runs the schedule of the sends to the page script.
    // WebUILayer.OnUpdate is the per-frame update of the web UI layer, with no pause check. The trade window pauses
    // the world, so the tick must be a web UI one. It returns at once while nothing is pending.
    [HarmonyPatch(typeof(WebUILayer), "OnUpdate")]
    internal static class PageTick
    {
        private static readonly PushSchedule schedule = new PushSchedule();
        private static readonly HashSet<string> warned = new HashSet<string>();

        // A refresh of the trade window: the next tick sends once, however many refreshes come in the frame.
        public static void Request() => schedule.Request(Time.realtimeSinceStartup);

        // The storage window is ready: the next tick runs the storage pass (the tag icon of the trading tag).
        public static void RequestStorage() => schedule.RequestStorage(Time.realtimeSinceStartup);

        // A message of the page script, with the prefix of the mod taken off.
        public static void OnMessage(string text) => schedule.OnMessage(text, Time.realtimeSinceStartup);

        // The trade window state, or null before the first open.
        public static State_Web_TradeUI TradeState() =>
            ReduxUISystem.Instance?.GetState<State_Web_TradeUI>(Il2CppType.Of<State_Web_TradeUI>());

        private static void Postfix()
        {
            try
            {
                DetailPopup.Tick();
                float now = Time.realtimeSinceStartup;
                if (!schedule.Pending(now)) return;
                var state = TradeState();
                bool open = state != null && state.OwnerId != 0;
                double buildMs = 0;
                var step = schedule.Tick(now, open, () =>
                {
                    long buildStart = Timing.Start();
                    string json = StateReader.Json(state);
                    buildMs = Timing.Ms(buildStart);
                    return json;
                });
                if (step.Kind == PushSchedule.Kind.None) return;
                long sendStart = Timing.Start();
                PageScript.Send(step);
                if (Plugin.Verbose.Value)
                {
                    // An apply carries no data.
                    double kb = step.Kind == PushSchedule.Kind.Apply ? 0 : Timing.Kb(step.Json);
                    Plugin.Log.LogDebug(FormattableString.Invariant($"timing: build {buildMs:0.00} ms, send {Timing.Ms(sendStart):0.00} ms, json {kb:0.0} KB ({step.Kind})"));
                }
            }
            catch (Exception e)
            {
                // A failure can repeat on each frame, so each distinct text logs once.
                if (warned.Add(e.Message)) Plugin.Log.LogWarning($"Better Trade page tick failed: {e}");
            }
        }
    }

    // The refresh of a window open comes one frame before the TradeUI page is ready, so its send can find no frame.
    // When the page tells the game that it is ready, the game calls CallShowAction of the page's view model, and a
    // request then makes the next tick send while the frame is there. WebUILayer.OnPageReady is inlined, so a patch of
    // it never runs; this call is virtual, so it cannot be inlined.
    [HarmonyPatch(typeof(WebUI_TradeUI), "CallShowAction")]
    internal static class PageTickOnCallShowAction
    {
        private static void Postfix()
        {
            try
            {
                StateReader.WindowOpened();
                PageTick.Request();
                if (Plugin.Verbose.Value) Plugin.Log.LogDebug("Better Trade page ready: TradeUI");
            }
            catch (Exception e)
            {
                Plugin.Log.LogError($"Better Trade page ready failed: {e}");
            }
        }
    }

    // The storage window: the same ready call as the trade window, so a storage pass gives the coin icon of the
    // trading tag to the tag rule in its frame. Attached only with TradeStorages on.
    [HarmonyPatch(typeof(WebUI_BackpackUI), "CallShowAction")]
    internal static class PageTickOnStorageShow
    {
        private static void Postfix()
        {
            try
            {
                PageTick.RequestStorage();
                if (Plugin.Verbose.Value) Plugin.Log.LogDebug("Better Trade page ready: BackpackUI");
            }
            catch (Exception e)
            {
                Plugin.Log.LogError($"Better Trade storage window ready failed: {e}");
            }
        }
    }
}
