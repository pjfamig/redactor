# app/services/redaction/detectors/names.rb
module Redaction
    module Detectors
      class Names
        # Very simple: First Last, optional middle initial, optional Dr/Mr/Ms prefix.
        # Avoids matching at start of sentence with common words by requiring capitalized tokens.
        NAME = /
          (?<![A-Za-z0-9])
          (?:Dr\.|Mr\.|Ms\.|Mrs\.)?\s*
          ([A-Z][a-z]+)
          (?:\s+[A-Z]\.)?
          \s+([A-Z][a-z]+)
          (?![A-Za-z0-9])
        /x
  
        def self.call(text)
          spans = []
          text.to_enum(:scan, NAME).each do
            m = Regexp.last_match
            spans << {
              start: m.begin(0),
              end: m.end(0),
              type: :name,
              value: m[0],
              confidence: 0.55
            }
          end
          spans
        end
      end
    end
  end
  