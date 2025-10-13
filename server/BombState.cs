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
}
