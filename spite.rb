width = ARGV[1] || 79
height = ARGV[2] || 123

def rule card, x, y, w, h
  ".#{card} { background-position: #{x}px #{y}px; width: #{w}px; height: #{h}px; }\n"
end

def cards w, h
  style = ".card, .stack { width: #{w}px; height: #{h}px; background-image: url('cards/dondorf.png'); background-repeat: no-repeat; }\n"
  y = 0
  ["c", "d", "h", "s"].each do |suit|
    x = 0
    (1..13).each do |rank|
      style << rule("#{suit}#{rank}", x, y, w, h)
      x -= w
    end
    y -= h
  end
  style << rule("face_down", -2 * w, -4 * h, w, h)
  style << rule("freestack", -3 * w, -4 * h, w, h)
  style << rule("freefoundation", -3 * w, -4 * h, w, h)
end

puts cards(width, height)
