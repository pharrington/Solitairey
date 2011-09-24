#!/usr/bin/env ruby

require "RMagick"
require "fileutils"

module Card
  def card_width
    self.columns / 13
  end

  def card_height
    self.rows / 5
  end

  def each_card
    w = self.card_width
    h = self.card_height

    y = 0
    ["c", "d", "h", "s"].each do |suit|
      x = 0
      (1..13).each do |rank|
        yield suit, rank, x, y
        x += w
      end
      y += h
    end

    ["facedown", "freeslot"].each_with_index do |name, i|
      yield name, "", w * (2 + i), h * 4
    end
  end

  def extract_card x, y
    w = self.card_width
    h = self.card_height

    pixels = self.export_pixels x, y, w, h, "RGBA"

    card = Magick::Image.new(w, h) do
      self.background_color = Magick::Pixel.new 0, 0, 0, 255
    end

    card.import_pixels 0, 0, w, h, "RGBA", pixels
  end
end

def split name
  image = Magick::Image.read("#{name}.png").first
  image.extend Card

  FileUtils.mkdir_p name

  image.each_card do |suit, rank, x, y|
    card = image.extract_card x, y

    card.write "#{name}/#{suit}#{rank}.png"
  end
end

if ARGV[0]
  split ARGV[0]
end
