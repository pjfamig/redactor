# app/services/redaction/detectors/dictionary.rb
module Redaction
    module Detectors
      class Dictionary
        # Common company suffixes that might follow a dictionary term
        COMPANY_SUFFIXES = /\s+(?:Partners?|LLC|Inc\.?|Corp\.?|Corporation|Ltd\.?|Limited|Co\.?|Company|Group|Associates?|Holdings?|Ventures?|Capital|Management|Solutions?|Services?|Systems?|Technologies?|Tech)(?:,\s*LLC)?/i

        def self.call(text, terms)
          spans = []
          terms.each do |term|
            next if term.length < 2
            escaped = Regexp.escape(term)
            
            # Match the term itself, with optional possessive ('s or ') and optional company suffix
            # Pattern: \bTerm\b or \bTerm's\b or \bTerm'\b, optionally followed by company suffix
            base_pattern = /\b#{escaped}(?:'s|')?\b/i
            
            text.to_enum(:scan, base_pattern).each do
              m = Regexp.last_match
              start_pos = m.begin(0)
              end_pos = m.end(0)
              
              # Check if there's a company suffix following (within reasonable distance)
              suffix_match = text[end_pos..(end_pos + 50)]&.match(/\A\s*#{COMPANY_SUFFIXES}/)
              if suffix_match
                end_pos = end_pos + suffix_match.end(0)
              end
              
              spans << {
                start: start_pos,
                end: end_pos,
                type: :custom,
                value: text[start_pos...end_pos],
                confidence: 0.9
              }
            end
          end
          spans
        end
      end
    end
  end
  