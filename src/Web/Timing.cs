using System.Diagnostics;

namespace BetterTrade
{
    // The numbers of the timing lines of the Verbose log: the time of a step of a send, and the size of a JSON text.
    internal static class Timing
    {
        public static long Start() => Stopwatch.GetTimestamp();

        public static double Ms(long start) => (Stopwatch.GetTimestamp() - start) * 1000.0 / Stopwatch.Frequency;

        // The size of a text in KB, by its character count.
        public static double Kb(string text) => (text?.Length ?? 0) / 1024.0;
    }
}
