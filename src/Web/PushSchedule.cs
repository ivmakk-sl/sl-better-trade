using System;

namespace BetterTrade
{
    // Decides on each frame whether the plugin sends to the page script, and what. No game or BepInEx type here: the
    // caller gives the real time. The sends have no result callback; the page answers only by message.
    //
    // - A refresh of the trade window sets a request. The next tick sends once: SetData when the data JSON differs
    //   from the last one sent, else Apply. So many refreshes in one frame make one send.
    // - Nothing goes while the window is closed, and a request of a closed window is dropped.
    // - A "no script" message (a new root page, or one that the game built again) makes the next tick of an open
    //   window send the script with the data. One full send at a time: another "no script" in the next few real
    //   seconds is an answer of the same round, so it is dropped; a browser crash can drop the script, so after that
    //   time the script can go again.
    // - A "no TradeUI frame" message makes a retry one real second later, while the request is less than 3 real
    //   seconds old. It is the only retry: the page has none.
    // - A build that throws (for example while the window closes) makes a retry one real second later, and rethrows to
    //   the caller.
    // - The storage window sets a storage request (the tag icon of the trading tag). With the trade window closed, the
    //   next tick sends the storage pass alone, or the script with no data and the storage pass when the root page has
    //   no script. With the trade window open, the storage pass rides on the trade send, or goes alone when there is
    //   none. A "no script" soon after a storage pass brings the storage request back for the full send. The storage
    //   pass has no retry: "no storage frame" makes no new send, and keeps a request made after the pass.
    public sealed class PushSchedule
    {
        public enum Kind { None, Apply, SetData, Full, Storage }

        public readonly struct Step
        {
            public readonly Kind Kind;
            // The data JSON of the send; null for None.
            public readonly string Json;
            // True for a send of the retry, false for the first send of a request.
            public readonly bool Retry;
            // True when the send also runs the storage pass.
            public readonly bool Storage;

            public Step(Kind kind, string json, bool retry, bool storage = false)
            {
                Kind = kind; Json = json; Retry = retry; Storage = storage;
            }
        }

        // The message of the page script when the trade window frame is not there.
        public const string NoFrame = "no TradeUI frame";

        // The message of the storage pass when the storage window frame is not there. It makes no retry: the next
        // ready call of the storage window makes a new request.
        public const string NoStorageFrame = "no storage frame";

        private const float RetrySeconds = 1f;
        private const float RequestSeconds = 3f;
        private const float FullSendWaitSeconds = 5f;

        private static readonly Step Nothing = new Step(Kind.None, null, false);

        private bool requested;
        private float requestAt = float.NegativeInfinity;
        private float retryAt = float.NaN;
        // The data JSON of the last send, which the page stores also when its pass finds no frame.
        private string sentJson;
        private bool fullPending;
        private float fullSentAt = float.NegativeInfinity;
        private bool storageRequested;
        private float storageSentAt = float.NegativeInfinity;

        // A refresh of the trade window.
        public void Request(float now)
        {
            requested = true;
            requestAt = now;
            retryAt = float.NaN;
        }

        // The storage window is ready: the next tick runs the storage pass.
        public void RequestStorage(float now)
        {
            storageRequested = true;
        }

        // True when the next tick can send: the caller then reads the window state, else it returns at once.
        public bool Pending(float now) =>
            requested || fullPending || storageRequested || (!float.IsNaN(retryAt) && now >= retryAt);

        public Step Tick(float now, bool windowOpen, Func<string> build)
        {
            if (!windowOpen)
            {
                requested = false;
                retryAt = float.NaN;
                if (!TakeStorage(now)) return Nothing;
                if (!fullPending) return new Step(Kind.Storage, null, false);
                // The root page has no script: the script with no data, because the trade window is closed.
                fullPending = false;
                fullSentAt = now;
                sentJson = null;
                return new Step(Kind.Full, null, false, storage: true);
            }

            if (fullPending)
            {
                string data = requested || sentJson == null ? Build(now, build) : sentJson;
                fullPending = false;
                fullSentAt = now;
                return Sent(Kind.Full, data, false, TakeStorage(now));
            }

            bool retry = false;
            if (!requested)
            {
                if (float.IsNaN(retryAt) || now < retryAt) return StorageAlone(now);
                retryAt = float.NaN;
                if (now - requestAt >= RequestSeconds) return StorageAlone(now);
                retry = true;
            }
            string json = Build(now, build);
            return Sent(json == sentJson ? Kind.Apply : Kind.SetData, json, retry, TakeStorage(now));
        }

        // A message of the page script, with the prefix of the mod taken off.
        public void OnMessage(string text, float now)
        {
            if (text == PageJson.NoScript)
            {
                if (now - fullSentAt < FullSendWaitSeconds) return;
                // A root page with no page script has no data either.
                sentJson = null;
                fullPending = true;
                // The answer of a storage pass: the full send runs the storage pass too.
                if (now - storageSentAt < RequestSeconds) storageRequested = true;
            }
            else if (text == NoStorageFrame)
            {
                // No retry: the send already took the request. A request set after that send (another storage window
                // ready before this answer came) stays.
            }
            else if (text == NoFrame)
            {
                // A later refresh makes its own send, so only the answer of the last send sets a retry.
                if (!requested) retryAt = now + RetrySeconds;
            }
        }

        private Step Sent(Kind kind, string json, bool retry, bool storage)
        {
            requested = false;
            sentJson = json;
            return new Step(kind, json, retry, storage);
        }

        // True when a storage request is there: the send runs the storage pass, and the request ends.
        private bool TakeStorage(float now)
        {
            if (!storageRequested) return false;
            storageRequested = false;
            storageSentAt = now;
            return true;
        }

        private Step StorageAlone(float now) => TakeStorage(now) ? new Step(Kind.Storage, null, false) : Nothing;

        private string Build(float now, Func<string> build)
        {
            try { return build(); }
            catch
            {
                requested = false;
                retryAt = now + RetrySeconds;
                throw;
            }
        }
    }
}
