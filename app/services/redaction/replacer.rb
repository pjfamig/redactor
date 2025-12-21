# app/services/redaction/replacer.rb
module Redaction
  class Replacer
    def self.apply(text, spans)
      counters = Hash.new(0)
      canonical_to_placeholder = {}

      # Add placeholder to each span, stable for same canonical value
      spans_with_ph = spans.map do |s|
        canonical = canonicalize(s[:type], s[:value])
        placeholder = canonical_to_placeholder[canonical]

        unless placeholder
          counters[s[:type]] += 1
          placeholder = "[#{s[:type].to_s.upcase}_#{counters[s[:type]]}]"
          canonical_to_placeholder[canonical] = placeholder
        end

        s.merge(placeholder: placeholder)
      end

      out = text.dup
      spans_with_ph.sort_by { |s| -s[:start].to_i }.each do |s|
        out[s[:start]...s[:end]] = s[:placeholder]
      end

      mapping = {
        # placeholder => canonical (or original) value, useful for review/debug
        placeholders: canonical_to_placeholder.invert,
        # canonical/original => placeholder
        canonical_map: canonical_to_placeholder
      }

      [mapping, out]
    end

    def self.canonicalize(type, value)
      v = value.to_s
      case type&.to_sym
      when :email
        v.downcase.strip
      when :phone
        v.gsub(/\D/, "")
      when :url
        v.strip
      else
        v.strip.downcase
      end
    end
  end
end
