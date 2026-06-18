(function attachPlayer(global) {
  function createPlayer() {
    return { x: 64, y: 64, w: 22, h: 26, speed: 2.4, facing: "down" }
  }

  function movePlayer(player, input, world) {
    const axis = { x: 0, y: 0 }
    if (input.left) axis.x -= 1
    if (input.right) axis.x += 1
    if (input.up) axis.y -= 1
    if (input.down) axis.y += 1

    if (axis.x !== 0) player.facing = axis.x < 0 ? "left" : "right"
    if (axis.y !== 0) player.facing = axis.y < 0 ? "up" : "down"
    if (axis.x !== 0 && axis.y !== 0) {
      axis.x *= 0.707
      axis.y *= 0.707
    }

    const nextX = { ...player, x: player.x + axis.x * player.speed }
    if (!world.rectHitsWall(nextX)) player.x = nextX.x

    const nextY = { ...player, y: player.y + axis.y * player.speed }
    if (!world.rectHitsWall(nextY)) player.y = nextY.y
  }

  function drawPlayer(ctx, player) {
    ctx.fillStyle = "#0b0d16"
    ctx.fillRect(player.x - 2, player.y + 19, player.w + 4, 8)
    ctx.fillStyle = "#ffd166"
    ctx.fillRect(player.x + 5, player.y, 12, 8)
    ctx.fillStyle = "#55d9ff"
    ctx.fillRect(player.x + 3, player.y + 8, 16, 14)
    ctx.fillStyle = "#f8f4d8"
    ctx.fillRect(player.x + 7, player.y + 3, 3, 3)
    ctx.fillRect(player.x + 13, player.y + 3, 3, 3)
    ctx.fillStyle = "#7cff9b"
    ctx.fillRect(player.x + (player.facing === "left" ? 0 : 17), player.y + 12, 5, 9)
  }

  global.CodexDojoPlayer = { createPlayer, drawPlayer, movePlayer }
})(window)
