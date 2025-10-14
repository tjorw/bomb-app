using System.Text.Json;
using Microsoft.AspNetCore.SignalR;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSignalR();
builder.Services.AddSingleton<BombService>();

var app = builder.Build();

app.UseDefaultFiles();
app.UseStaticFiles(new StaticFileOptions {
  OnPrepareResponse = ctx => {
    var p = ctx.File.PhysicalPath ?? "";
    if (p.EndsWith("index.html", StringComparison.OrdinalIgnoreCase)) {
      ctx.Context.Response.Headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
      ctx.Context.Response.Headers["Pragma"] = "no-cache";
      ctx.Context.Response.Headers["Expires"] = "0";
    }
  }
});

app.MapHub<BombHub>("/bomhub");

// API
app.MapGet("/api/state", (BombService bomb) => Results.Ok(bomb.GetState()));

app.MapPost("/api/submit-code", async (HttpRequest request, BombService bomb) =>
{
    var body = await new StreamReader(request.Body).ReadToEndAsync();
    if (string.IsNullOrWhiteSpace(body)) return Results.BadRequest("Missing code");
    string code;
    if (body.Trim().StartsWith("{"))
    {
        using var doc = JsonDocument.Parse(body);
        if (!doc.RootElement.TryGetProperty("code", out var prop))
            return Results.BadRequest("Missing code property");
        code = prop.GetString() ?? "";
    }
    else code = body.Trim();

    var (success, reason) = await bomb.TrySubmitCode(code);
    return success
        ? Results.Ok(new { success = true, reason })
        : Results.BadRequest(new { success = false, reason });
});

app.MapPost("/api/admin/registerfail", async (BombService bomb) =>
{
    await bomb.RegisterFail();
    return Results.Ok();
});

app.MapPost("/api/admin/undofail", async (BombService bomb) =>
{
    await bomb.UndoFail();
    return Results.Ok();
});

app.MapPost("/api/admin/reset", async (BombService bomb) =>
{
    await bomb.Reset();
    return Results.Ok();
});

app.MapPost("/api/admin/pause", async (BombService bomb) =>
{
    await bomb.PauseAsync();
    return Results.Ok();
});

app.MapPost("/api/admin/resume", async (BombService bomb) =>
{
    await bomb.ResumeAsync();
    return Results.Ok();
});

app.MapPost("/api/admin/set-time", async (HttpRequest req, BombService bomb) =>
{
    var body = await new StreamReader(req.Body).ReadToEndAsync();
    if (string.IsNullOrWhiteSpace(body)) return Results.BadRequest("Missing body");
    using var doc = JsonDocument.Parse(body);
    if (!doc.RootElement.TryGetProperty("seconds", out var secProp))
        return Results.BadRequest("Missing 'seconds'");
    var seconds = secProp.GetInt32();
    bool? autostart = null;
    if (doc.RootElement.TryGetProperty("autostart", out var autoProp))
        autostart = autoProp.GetBoolean();
    await bomb.SetTimeAsync(seconds, autostart);
    return Results.Ok();
});

app.Run();
