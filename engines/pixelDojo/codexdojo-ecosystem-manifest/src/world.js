(function attachWorld(global) {
  const tileSize = 32
  const map = [
    "########################",
    "#..........#...........#",
    "#..####....#....####...#",
    "#......................#",
    "#......................#",
    "#......................#",
    "#..#.......##......#...#",
    "#..#.......##......#...#",
    "#......................#",
    "#......................#",
    "#......................#",
    "#...####....#....####..#",
    "#...........#..........#",
    "#......................#",
    "#......................#",
    "########################",
  ]

  function isBlockedAt(x, y) {
    const column = Math.floor(x / tileSize)
    const row = Math.floor(y / tileSize)
    return !map[row] || map[row][column] === "#"
  }

  function rectHitsWall(rect) {
    return (
      isBlockedAt(rect.x, rect.y) ||
      isBlockedAt(rect.x + rect.w, rect.y) ||
      isBlockedAt(rect.x, rect.y + rect.h) ||
      isBlockedAt(rect.x + rect.w, rect.y + rect.h)
    )
  }

  function drawWorld(ctx) {
    for (let row = 0; row < map.length; row += 1) {
      for (let column = 0; column < map[row].length; column += 1) {
        const x = column * tileSize
        const y = row * tileSize
        const blocked = map[row][column] === "#"
        ctx.fillStyle = blocked ? "#2f3657" : (row + column) % 2 === 0 ? "#151b2b" : "#182033"
        ctx.fillRect(x, y, tileSize, tileSize)
        ctx.fillStyle = blocked ? "#47527d" : "#202945"
        ctx.fillRect(x + 2, y + 2, tileSize - 4, blocked ? 6 : 2)
      }
    }
  }

  global.CodexDojoWorld = { drawWorld, map, rectHitsWall, tileSize }
})(window)
