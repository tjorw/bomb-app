using System.Threading;
using Microsoft.AspNetCore.SignalR;

public class BombService
{
    readonly object _lock = new();
    private Timer? _timer;
    private readonly IHubContext<BombHub>? _hubContext;

    private GameState _state = new GameState();

    public BombService(IHubContext<BombHub> hubContext)
    {
        _state = new GameState();
        _state.CorrectCode = "6459";
        _state.BombCountDownSeconds = 90 * 60;
        _state.BombFailedPenaltySeconds = 60;
        _state.MaxAttempts = 20;
        _state.WireSequence = new[] { "red", "blue",  "yellow", "black" };
        _state.WireCountDownSeconds = 5;
        _hubContext = hubContext;
        StartNewCountdown();
    }

    public BombDto GetState()
    {
        lock (_lock)
        {
            return new BombDto
            {
                Status = _state.Status,
                RemainingSeconds = _state.BombRemainingSeconds,
                Paused = _state.Paused,
                FailedAttempts = _state.FailedAttempts,
                MaxAttempts = _state.MaxAttempts,
                CodeEnabled = _state.CodeEnabled,
                ActivationIndex = _state.ActivationIndex,
                ActivationTotal = _state.ActivationTotal,
                LastActivationMsg = _state.LastActivationMsg
            };
        }
    }

    public async Task<(bool success, string reason)> TrySubmitCode(string code)
    {
        lock (_lock)
        {
            if (_state.Status != BombStatus.Odesarmerad)
                return (false, "Bomben är inte i ett desarmeringsbart läge.");

            if (code == _state.CorrectCode)
            {
                handleSuccess();
            }
            else
            {
                handleFail();
            }
        }

        await BroadcastState();

        if (_state.Status == BombStatus.Desarmerad) return (true, "Desarmerad");
        if (_state.Status == BombStatus.Exploderad) return (false, "Felkod: max antal försök uppnått. Bomben exploderade.");
        return (false, $"Fel kod — {_state.FailedAttempts}/{_state.MaxAttempts} försök använda.");
    }
    public async Task UndoFail()
    {

        lock (_lock)
        {
            if (_state.Status != BombStatus.Odesarmerad) return;
            undoFail();
        }

        await BroadcastState();

    }
    public async Task RegisterFail()
    {

        lock (_lock)
        {
            if (_state.Status != BombStatus.Odesarmerad) return;
            handleFail();
        }

        await BroadcastState();

    }

    public async Task Reset()
    {
        lock (_lock)
        {
            _state.Reset();
        }
        StartTimer();
        await BroadcastState();
    }

    public async Task PauseAsync()
    {
        lock (_lock) { _state.Paused = true; }
        await BroadcastState();
    }

    public async Task ResumeAsync()
    {
        lock (_lock)
        {
            _state.Paused = false;
            if (_state.Status == BombStatus.Odesarmerad && _timer is null)
                StartTimer();
        }
        await BroadcastState();
    }

    public async Task SetTimeAsync(int seconds, bool? autostart = null)
    {
        if (seconds < 0) seconds = 0;
        lock (_lock)
        {
            _state.BombRemainingSeconds = seconds;

            if (autostart.HasValue)
                _state.Paused = !autostart.Value;

            if (_state.Status != BombStatus.Odesarmerad)
                _state.Status = BombStatus.Odesarmerad;

            _state.FailedAttempts = 0;

            if (!_state.Paused) StartTimer();
            else StopTimer();
        }
        await BroadcastState();
    }

    // 🔌 Tryck på en sladd (färg)
    public async Task<(bool ok, string msg, bool completed)> PressWireAsync(string color)
    {
        bool completed = false;
        lock (_lock)
        {
            if (_state.Status != BombStatus.Odesarmerad)
            {
                _state.LastActivationMsg = "Bomben är inte aktiverbar i nuläget.";
                return (false, _state.LastActivationMsg, false);
            }
            if (_state.CodeEnabled)
            {
                _state.LastActivationMsg = "Redan aktiverad.";
                return (true, _state.LastActivationMsg, true);
            }

            var expected = _state.WireSequence[_state.ActivationIndex];
            if (string.Equals(color, expected, StringComparison.OrdinalIgnoreCase))
            {
                _state.ActivationIndex++;
                _state.WireRemainingSeconds = _state.WireCountDownSeconds;
                if (_state.ActivationIndex >= _state.WireSequence.Length)
                {
                    _state.CodeEnabled = true;
                    _state.WireRemainingSeconds = 0;
                    completed = true;
                    _state.LastActivationMsg = "Aktivering klar! Kodsidan är upplåst.";
                }
                else
                {
                    _state.LastActivationMsg = $"Rätt! ({_state.ActivationIndex}/{_state.WireSequence.Length}) — nästa sladd…";
                }
            }
            else
            {
                // Fel ordning → nollställ progress
                _state.ActivationIndex = 0;
                _state.WireRemainingSeconds = 0;
                _state.LastActivationMsg = "Fel ordning! Börja om från första sladden.";
            }
        }
        await BroadcastState();
        return (completed, _state.LastActivationMsg, completed);
    }

    private void StartNewCountdown()
    {
        lock (_lock)
        {
            _state.Reset();
        }
        StartTimer();
    }

    private void StartTimer()
    {
        StopTimer();
        _timer = new Timer(Tick, null, 1000, 1000);
    }

    private void StopTimer()
    {
        _timer?.Change(Timeout.Infinite, Timeout.Infinite);
        _timer?.Dispose();
        _timer = null;
    }

    private async void Tick(object? state)
    {
        bool notify = false;
        lock (_lock)
        {
            if (_state.Status != BombStatus.Odesarmerad) return;
            if (_state.Paused) { notify = true; }
            else
            {
                _state.BombRemainingSeconds--;
                notify = true;
                if (_state.BombRemainingSeconds <= 0)
                {
                    _state.Status = BombStatus.Exploderad;
                    StopTimer();
                }

                if(_state.ActivationIndex > 0)
                {
                    _state.WireRemainingSeconds--;
                    if(_state.WireRemainingSeconds <= 0)
                    {
                        // Tiden för att trycka på nästa sladd har gått ut
                        _state.ActivationIndex = 0;
                        _state.WireRemainingSeconds = 0;
                        _state.LastActivationMsg = "Tiden för att trycka på nästa sladd har gått ut! Börja om från första sladden.";
                    }
                }
            }
        }
        if (notify) await BroadcastState();
    }

    private Task BroadcastState()
    {
        var dto = GetState();
        return _hubContext!.Clients.All.SendAsync("StateUpdated", dto);
    }

    private void handleSuccess()
    {
        _state.Status = BombStatus.Desarmerad;
        StopTimer();
    }

    private void handleFail()
    {
        _state.FailedAttempts++;
        _state.BombRemainingSeconds -= _state.BombFailedPenaltySeconds;
        if (_state.BombRemainingSeconds <= 0)
        {
            _state.Status = BombStatus.Exploderad;
            _state.BombRemainingSeconds = 0;
            StopTimer();
        }
        if (_state.FailedAttempts >= _state.MaxAttempts)
        {
            _state.Status = BombStatus.Exploderad;
            StopTimer();
        }

    }

    private void undoFail()
    {
        if (_state.FailedAttempts <= 0) return;

        _state.FailedAttempts--;
        _state.BombRemainingSeconds += _state.BombFailedPenaltySeconds;
    }
       
}
