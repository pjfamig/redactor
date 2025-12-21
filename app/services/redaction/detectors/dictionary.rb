# app/services/redaction/detectors/dictionary.rb
module Redaction
    module Detectors
      class Dictionary
        def self.call(text, terms)
          spans = []
          terms.each do |term|
            next if term.length < 2
            regex = /\b#{Regexp.escape(term)}\b/i
            spans += text.to_enum(:scan, regex).map do
              m = Regexp.last_match
              { start: m.begin(0), end: m.end(0), type: :custom, value: m[0], confidence: 0.9 }
            end
          end
          spans
        end
      end
    end
  end
  