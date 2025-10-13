using System.Threading;
using Microsoft.AspNetCore.SignalR;

public class BombService
{
    readonly object _lock = new();
    private Timer? _timer;
    private int _remainingSeconds;
    private bool _paused;
    private BombStatus _status = BombStatus.Odesarmerad;
    private readonly string _correctCode;
    private readonly IHubContext<BombHub>? _hubContext;

    private int _failedAttempts = 0;

    private readonly int _maxAttempts;
    private readonly int _failedTimePenaltySeconds;

    private readonly int _countDownSeconds;

    public BombService(IHubContext<BombHub> hubContext)
    {
        _hubContext = hubContext;
        _correctCode = "1234";
        _countDownSeconds = 90 * 60;
        _maxAttempts = 20;
        _failedTimePenaltySeconds = 60;
        StartNewCountdown(_countDownSeconds);
    }

    public BombDto GetState()
    {
        lock (_lock)
        {
            return new BombDto
            {
                Status = _status,
                RemainingSeconds = _remainingSeconds,
                Paused = _paused,
                FailedAttempts = _failedAttempts,
                MaxAttempts = _maxAttempts
            };
        }
    }

    public async Task<(bool success, string reason)> TrySubmitCode(string code)
    {
        lock (_lock)
        {
            if (_status != BombStatus.Odesarmerad)
                return (false, "Bomben är inte i ett desarmeringsbart läge.");

            if (code == _correctCode)
            {
                handleSuccess();
            }
            else
            {
                handleFail();
            }
        }

        await BroadcastState();

        if (_status == BombStatus.Desarmerad) return (true, "Desarmerad");
        if (_status == BombStatus.Exploderad) return (false, "Felkod: max antal försök uppnått. Bomben exploderade.");
        return (false, $"Fel kod — {_failedAttempts}/{_maxAttempts} försök använda.");
    }
    public async Task UndoFail()
    {
       
        lock (_lock)
        {
            if (_status != BombStatus.Odesarmerad) return;
            undoFail();
        }

        await BroadcastState();

    }    public async Task RegisterFail()
    {
       
        lock (_lock)
        {
            if (_status != BombStatus.Odesarmerad) return;
            handleFail();
        }

        await BroadcastState();

    }
    private void handleSuccess()
    {
        _status = BombStatus.Desarmerad;
        StopTimer();
    }

    private void handleFail()
    {
        _failedAttempts++;
        _remainingSeconds -= _failedTimePenaltySeconds;
        if (_remainingSeconds <= 0)
        {
            _status = BombStatus.Exploderad;
            _remainingSeconds = 0;
            StopTimer();
        }
        if (_failedAttempts >= _maxAttempts)
        {
            _status = BombStatus.Exploderad;
            StopTimer();
        }

    }

    private void undoFail()
    {
        if (_failedAttempts <= 0) return;

        _failedAttempts--;
        _remainingSeconds += _failedTimePenaltySeconds;
    }
        

    public async Task Reset()
    {
        lock (_lock)
        {
            _status = BombStatus.Odesarmerad;
            _remainingSeconds = _countDownSeconds;
            _paused = false;
            _failedAttempts = 0;
        }
        StartTimer();
        await BroadcastState();
    }

    public async Task PauseAsync()
    {
        lock (_lock) { _paused = true; }
        await BroadcastState();
    }

    public async Task ResumeAsync()
    {
        lock (_lock)
        {
            _paused = false;
            if (_status == BombStatus.Odesarmerad && _timer is null)
                StartTimer();
        }
        await BroadcastState();
    }

    public async Task SetTimeAsync(int seconds, bool? autostart = null)
    {
        if (seconds < 0) seconds = 0;
        lock (_lock)
        {
            _remainingSeconds = seconds;

            if (autostart.HasValue)
                _paused = !autostart.Value;

            if (_status != BombStatus.Odesarmerad)
                _status = BombStatus.Odesarmerad;

            _failedAttempts = 0;

            if (!_paused) StartTimer();
            else StopTimer();
        }
        await BroadcastState();
    }

    private void StartNewCountdown(int seconds)
    {
        lock (_lock)
        {
            _remainingSeconds = seconds;
            _status = BombStatus.Odesarmerad;
            _paused = false;
            _failedAttempts = 0;
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
            if (_status != BombStatus.Odesarmerad) return;
            if (_paused) { notify = true; }
            else
            {
                _remainingSeconds--;
                notify = true;
                if (_remainingSeconds <= 0)
                {
                    _status = BombStatus.Exploderad;
                    StopTimer();
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
}
