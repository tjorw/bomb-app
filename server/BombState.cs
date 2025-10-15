using System.Security.Cryptography.X509Certificates;

public enum BombStatus
{
    Odesarmerad,
    Desarmerad,
    Exploderad
}

public class BombDto
{
    public BombStatus Status { get; set; }
    public int RemainingSeconds { get; set; }
    public bool Paused { get; set; }
    public int FailedAttempts { get; set; }
    public int MaxAttempts { get; set; }

        // 🔌 Aktiveringspussel (kablage)
    public bool CodeEnabled { get; set; }          // true när rätt sekvens är klar
    public int ActivationIndex { get; set; }       // hur många rätt i följd (0..6)
    public int ActivationTotal { get; set; }       // 6
    public string? LastActivationMsg { get; set; } // feedback på senaste tryck
}


public class GameState()
{

    public bool CodeEnabled { get; set; }          // true när rätt sekvens är klar
    public int ActivationIndex { get; set; }       // hur många rätt i följd (0..6)
    public int ActivationTotal => WireSequence.Length;   
    public string? LastActivationMsg { get; set; } // feedback på senaste tryck
    public int FailedAttempts { get; set; }
    public int MaxAttempts { get; set; }
    public int BombRemainingSeconds { get; set; }
    public int BombCountDownSeconds { get; set; }
    public int BombFailedPenaltySeconds { get; set; }
    public int WireCountDownSeconds { get; set; }
    public int WireRemainingSeconds { get; set; }
    public bool Paused { get; set; }
    public BombStatus Status = BombStatus.Odesarmerad;
    public string CorrectCode { get; set; } = "";
    public string[] WireSequence { get; set; } = [];

    public void Reset()
    {
        Status = BombStatus.Odesarmerad;
        BombRemainingSeconds = BombCountDownSeconds;
        Paused = false;
        FailedAttempts = 0;
        ActivationIndex = 0;
        CodeEnabled = false;
        LastActivationMsg = "";
    }

    public void ResetWires()
    {
        ActivationIndex = 0;
    }


}