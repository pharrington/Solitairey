#!/usr/bin/evn ruby

prefix = "js/"
js = %w[solitaire iphone auto-stack-clear auto-turnover autoplay ie-opera-background-fix statistics agnes klondike klondike1t flowergarden fortythieves freecell grandclock montecarlo pyramid scorpion spider spider1s spider2s tritowers yukon application]
all = "#{prefix}all.js"
File.open(all, "w") do |f|
  js.each do |fn|
    f.write(File.read("#{prefix}#{fn}.js"))
  end
end
