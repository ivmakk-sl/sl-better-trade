using System;
using System.Collections.Generic;
using GameCore.HotUpdate.ReduxUI;

namespace BetterTrade
{
    // Runs the page script (the Vite bundle of src/Web/page) in the root page, which reaches the TradeUI iframe
    // itself. Each call has a null callback: the page answers only by message (WebOnHandleMessageEmitted), and a root
    // page with no script posts "no script", after which the schedule sends the script with the data.
    internal static class PageScript
    {
        private static string script;
        private static readonly HashSet<string> warned = new HashSet<string>();

        // The Vite bundle, embedded by BetterTrade.csproj under this name.
        private static string Script()
        {
            if (script != null) return script;
            using (var stream = typeof(PageScript).Assembly.GetManifestResourceStream("BetterTrade.page.js"))
            using (var reader = new System.IO.StreamReader(stream))
                script = reader.ReadToEnd();
            return script;
        }

        private static Vuplex.WebView.IWebView WebView() =>
            ReduxUISystem.Instance?.GetWebUILayer()?.canvasWebViewPrefab?.WebView;

        public static void Send(PushSchedule.Step step)
        {
            var webView = WebView();
            if (webView == null)
            {
                if (warned.Add("no web view")) Plugin.Log.LogWarning("Better Trade: web view not found");
                return;
            }
            string command;
            switch (step.Kind)
            {
                case PushSchedule.Kind.Apply: command = PageJson.ApplyCommand; break;
                case PushSchedule.Kind.SetData: command = PageJson.SetDataCommand(step.Json); break;
                case PushSchedule.Kind.Full: command = PageJson.SetDataWithScriptCommand(Script(), step.Json); break;
                case PushSchedule.Kind.Storage: command = PageJson.StorageCommand; break;
                default: return;
            }
            if (step.Storage) command += PageJson.StoragePass;
            try
            {
                webView.ExecuteJavaScript(command, (Il2CppSystem.Action<string>)null);
            }
            catch (Exception e)
            {
                // A web view that is being built again or disposed can throw at the call itself.
                if (warned.Add(e.Message)) Plugin.Log.LogWarning($"Better Trade send failed: {e.Message}");
                return;
            }
            if (Plugin.Verbose.Value)
                Plugin.Log.LogDebug($"Better Trade send: {step.Kind}{(step.Retry ? " retry" : "")}{(step.Storage ? " storage" : "")} {step.Json?.Length ?? 0} chars");
        }
    }
}
