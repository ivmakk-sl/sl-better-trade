using BetterTrade;
using Xunit;

namespace BetterTrade.Tests
{
    public class PushScheduleTests
    {
        private const string A = "{\"mode\":\"trade\"}";
        private const string B = "{\"mode\":\"supply\"}";

        private static PushSchedule.Step Tick(PushSchedule s, float now, string json, bool open = true) =>
            s.Tick(now, open, () => json);

        [Fact]
        public void A_request_makes_one_send_of_the_data_on_the_next_tick()
        {
            var s = new PushSchedule();
            s.Request(0f);

            var step = Tick(s, 0f, A);

            Assert.Equal(PushSchedule.Kind.SetData, step.Kind);
            Assert.Equal(A, step.Json);
            Assert.Equal(PushSchedule.Kind.None, Tick(s, 0.1f, A).Kind);
        }

        [Fact]
        public void Several_requests_in_one_frame_make_one_send()
        {
            var s = new PushSchedule();
            s.Request(0f);
            s.Request(0f);
            s.Request(0f);

            Assert.Equal(PushSchedule.Kind.SetData, Tick(s, 0f, A).Kind);
            Assert.Equal(PushSchedule.Kind.None, Tick(s, 0.02f, A).Kind);
        }

        [Fact]
        public void The_same_data_again_makes_an_apply_and_new_data_a_send_of_the_data()
        {
            var s = new PushSchedule();
            s.Request(0f);
            Tick(s, 0f, A);

            s.Request(1f);
            Assert.Equal(PushSchedule.Kind.Apply, Tick(s, 1f, A).Kind);

            s.Request(2f);
            var step = Tick(s, 2f, B);
            Assert.Equal(PushSchedule.Kind.SetData, step.Kind);
            Assert.Equal(B, step.Json);
        }

        [Fact]
        public void No_send_while_the_window_is_closed()
        {
            var s = new PushSchedule();
            s.Request(0f);

            Assert.Equal(PushSchedule.Kind.None, Tick(s, 0f, A, open: false).Kind);
            Assert.Equal(PushSchedule.Kind.None, Tick(s, 0.1f, A).Kind);
        }

        [Fact]
        public void No_script_makes_the_next_tick_send_the_script_with_the_last_data()
        {
            var s = new PushSchedule();
            s.Request(0f);
            Tick(s, 0f, A);

            s.OnMessage(PageJson.NoScript, 0.01f);
            var step = Tick(s, 0.02f, A);

            Assert.Equal(PushSchedule.Kind.Full, step.Kind);
            Assert.Equal(A, step.Json);
            Assert.Equal(PushSchedule.Kind.None, Tick(s, 0.03f, A).Kind);
        }

        [Fact]
        public void The_script_goes_only_after_no_script()
        {
            var s = new PushSchedule();
            for (int i = 0; i < 5; i++)
            {
                s.Request(i);
                Assert.NotEqual(PushSchedule.Kind.Full, Tick(s, i, i % 2 == 0 ? A : B).Kind);
            }
        }

        [Fact]
        public void One_full_send_at_a_time_with_a_time_limit()
        {
            var s = new PushSchedule();
            s.Request(0f);
            Tick(s, 0f, A);
            s.OnMessage(PageJson.NoScript, 0f);
            Assert.Equal(PushSchedule.Kind.Full, Tick(s, 0f, A).Kind);

            // A second answer of the same send round, while the script is on its way.
            s.OnMessage(PageJson.NoScript, 1f);
            Assert.Equal(PushSchedule.Kind.None, Tick(s, 1f, A).Kind);

            // The browser dropped the script: after the time limit the script goes again.
            s.OnMessage(PageJson.NoScript, 6f);
            Assert.Equal(PushSchedule.Kind.Full, Tick(s, 6f, A).Kind);
        }

        [Fact]
        public void No_script_while_the_window_is_closed_waits_for_the_window()
        {
            var s = new PushSchedule();
            s.Request(0f);
            Tick(s, 0f, A);
            s.OnMessage(PageJson.NoScript, 0.01f);

            Assert.Equal(PushSchedule.Kind.None, Tick(s, 0.02f, A, open: false).Kind);
            s.Request(10f);
            Assert.Equal(PushSchedule.Kind.Full, Tick(s, 10f, A).Kind);
        }

        [Fact]
        public void No_frame_sends_again_one_real_second_later()
        {
            var s = new PushSchedule();
            s.Request(0f);
            Tick(s, 0f, A);
            s.OnMessage(PushSchedule.NoFrame, 0.01f);

            Assert.Equal(PushSchedule.Kind.None, Tick(s, 0.5f, A).Kind);
            var step = Tick(s, 1.02f, A);
            Assert.Equal(PushSchedule.Kind.Apply, step.Kind);
            Assert.True(step.Retry);
        }

        [Fact]
        public void No_frame_stops_the_retry_a_few_seconds_after_the_request()
        {
            var s = new PushSchedule();
            s.Request(0f);
            Tick(s, 0f, A);
            s.OnMessage(PushSchedule.NoFrame, 0.01f);
            Tick(s, 1.02f, A);
            s.OnMessage(PushSchedule.NoFrame, 1.03f);
            Tick(s, 2.05f, A);
            s.OnMessage(PushSchedule.NoFrame, 2.06f);

            Assert.Equal(PushSchedule.Kind.None, Tick(s, 3.1f, A).Kind);
            Assert.Equal(PushSchedule.Kind.None, Tick(s, 10f, A).Kind);
        }

        [Fact]
        public void A_build_that_throws_keeps_the_change_for_a_retry()
        {
            var s = new PushSchedule();
            s.Request(0f);

            Assert.Throws<System.InvalidOperationException>(() => s.Tick(0f, true, () => throw new System.InvalidOperationException()));
            Assert.Equal(PushSchedule.Kind.None, Tick(s, 0.5f, A).Kind);
            Assert.Equal(PushSchedule.Kind.SetData, Tick(s, 1.01f, A).Kind);
        }

        [Fact]
        public void Pending_is_true_only_while_a_request_a_due_retry_or_a_full_send_waits()
        {
            var s = new PushSchedule();
            Assert.False(s.Pending(0f));

            s.Request(0f);
            Assert.True(s.Pending(0f));
            Tick(s, 0f, A);
            Assert.False(s.Pending(0.1f));

            s.OnMessage(PushSchedule.NoFrame, 0.1f);
            Assert.False(s.Pending(0.5f));
            Assert.True(s.Pending(1.2f));
            Tick(s, 1.2f, A);

            s.OnMessage(PageJson.NoScript, 1.3f);
            Assert.True(s.Pending(1.3f));
        }

        [Fact]
        public void Another_message_changes_nothing()
        {
            var s = new PushSchedule();
            s.Request(0f);
            Tick(s, 0f, A);
            s.OnMessage("missing: bar(.bal-track)", 0.01f);

            Assert.Equal(PushSchedule.Kind.None, Tick(s, 2f, A).Kind);
        }

        // The storage window: the tag icon of the trading tag, with no trade window open.
        [Fact]
        public void A_storage_request_with_the_trade_window_closed_makes_one_storage_pass()
        {
            var s = new PushSchedule();
            s.RequestStorage(0f);

            Assert.True(s.Pending(0f));
            var step = Tick(s, 0f, A, open: false);

            Assert.Equal(PushSchedule.Kind.Storage, step.Kind);
            Assert.Null(step.Json);
            Assert.False(s.Pending(0.1f));
            Assert.Equal(PushSchedule.Kind.None, Tick(s, 0.1f, A, open: false).Kind);
        }

        [Fact]
        public void No_script_after_a_storage_pass_sends_the_script_with_no_data_and_the_storage_pass()
        {
            var s = new PushSchedule();
            s.RequestStorage(0f);
            Tick(s, 0f, A, open: false);
            s.OnMessage(PageJson.NoScript, 0.05f);

            var step = s.Tick(0.1f, false, () => throw new System.InvalidOperationException("no trade state"));

            Assert.Equal(PushSchedule.Kind.Full, step.Kind);
            Assert.Null(step.Json);
            Assert.True(step.Storage);
            Assert.False(s.Pending(0.2f));
        }

        [Fact]
        public void A_trade_send_does_not_run_the_storage_pass()
        {
            var s = new PushSchedule();
            s.Request(0f);

            Assert.False(Tick(s, 0f, A).Storage);
        }

        [Fact]
        public void With_the_trade_window_open_a_storage_request_rides_on_the_trade_send()
        {
            var s = new PushSchedule();
            s.Request(0f);
            s.RequestStorage(0f);

            var step = Tick(s, 0f, A);

            Assert.Equal(PushSchedule.Kind.SetData, step.Kind);
            Assert.True(step.Storage);
            Assert.False(s.Pending(0.1f));
        }

        [Fact]
        public void With_the_trade_window_open_and_no_trade_request_the_storage_pass_goes_alone()
        {
            var s = new PushSchedule();
            s.Request(0f);
            Tick(s, 0f, A);
            s.RequestStorage(1f);

            var step = Tick(s, 1f, A);

            Assert.Equal(PushSchedule.Kind.Storage, step.Kind);
            Assert.False(s.Pending(1.1f));
        }

        [Fact]
        public void No_script_with_the_trade_window_open_sends_the_script_with_the_data_and_the_storage_pass()
        {
            var s = new PushSchedule();
            s.RequestStorage(0f);
            Tick(s, 0f, A);
            s.OnMessage(PageJson.NoScript, 0.05f);

            var step = Tick(s, 0.1f, A);

            Assert.Equal(PushSchedule.Kind.Full, step.Kind);
            Assert.Equal(A, step.Json);
            Assert.True(step.Storage);
        }

        [Fact]
        public void No_storage_frame_ends_the_storage_request_with_no_retry()
        {
            var s = new PushSchedule();
            s.RequestStorage(0f);
            Tick(s, 0f, A, open: false);
            s.OnMessage(PushSchedule.NoStorageFrame, 0.05f);

            Assert.False(s.Pending(1.5f));
            Assert.Equal(PushSchedule.Kind.None, Tick(s, 1.5f, A, open: false).Kind);
        }

        [Fact]
        public void No_storage_frame_keeps_a_storage_request_made_after_the_pass()
        {
            var s = new PushSchedule();
            s.RequestStorage(0f);
            Tick(s, 0f, A, open: false);
            s.RequestStorage(0.02f);
            s.OnMessage(PushSchedule.NoStorageFrame, 0.05f);

            Assert.Equal(PushSchedule.Kind.Storage, Tick(s, 0.06f, A, open: false).Kind);
        }

        [Fact]
        public void No_trade_frame_after_a_storage_pass_makes_no_retry()
        {
            var s = new PushSchedule();
            s.RequestStorage(0f);
            Tick(s, 0f, A, open: false);
            s.OnMessage(PushSchedule.NoFrame, 0.05f);

            Assert.Equal(PushSchedule.Kind.None, Tick(s, 1.5f, A, open: false).Kind);
        }
    }
}
