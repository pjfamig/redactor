# app/services/redaction/detectors/names.rb
module Redaction
    module Detectors
      class Names
        # Person names: First Last, optional middle initial, optional Dr/Mr/Ms prefix.
        PERSON_NAME = /
          (?<![A-Za-z0-9])
          (?:Dr\.|Mr\.|Ms\.|Mrs\.)?\s*
          ([A-Z][a-z]+)
          (?:\s+[A-Z]\.)?
          \s+([A-Z][a-z]+)
          (?![A-Za-z0-9])
        /x

        # Title + single name (e.g. "Mr. Henderson", "Dr. Wong") when no first name given
        TITLE_LASTNAME = /
          (?<![A-Za-z0-9])
          (?:Dr\.|Mr\.|Ms\.|Mrs\.)\s+
          ([A-Z][a-z]+)
          (?![A-Za-z0-9])
        /x

        # Greeting line: "Hi FirstName LastName," or "Hello FirstName LastName,"
        GREETING_NAME = /
          (?:^|\n)
          (?:Hi|Hello|Dear)\s+
          ([A-Z][a-z]+\s+[A-Z][a-z]+)
          [,\s]
        /x

        # Signature line: after "Thanks," / "Regards," etc., the next line is "FirstName LastName"
        SIGNATURE_NAME = %r{(?:Thanks|Regards|Best|Sincerely|Cheers),?\s*\n\s*([A-Z][a-z]+\s+[A-Z][a-z]+)\s*$}m

        # Company names with common suffixes (matches single or multiple capitalized words followed by suffix)
        COMPANY_NAME = /
          (?<![A-Za-z0-9])
          ([A-Z][A-Za-z0-9&.]+(?:\s+[A-Z][A-Za-z0-9&.]+)*)
          \s+(?:Partners?|LLC|Inc\.?|Corp\.?|Corporation|Ltd\.?|Limited|Co\.?|Company|Group|Associates?|Holdings?|Ventures?|Capital|Management|Solutions?|Services?|Systems?|Technologies?|Tech)
          (?:,\s*LLC)?\s*
          (?![A-Za-z0-9])
        /ix

        # Company suffix pattern (used to extend existing matches)
        COMPANY_SUFFIX = /\s+(?:Partners?|LLC|Inc\.?|Corp\.?|Corporation|Ltd\.?|Limited|Co\.?|Company|Group|Associates?|Holdings?|Ventures?|Capital|Management|Solutions?|Services?|Systems?|Technologies?|Tech)(?:,\s*LLC)?/i

        # Standalone first names in name-like contexts (lower confidence to avoid false positives)
        # Matches capitalized words followed by verbs/actions that suggest a person
        STANDALONE_NAME = /
          (?<![A-Za-z0-9])
          ([A-Z][a-z]{2,})
          \s+(?:can|is|was|has|had|will|would|should|could|may|might)\s+(?:be|reach|contact|speak|meet|work|live|reside|attend)
        /ix

        # Possessive company names (like "Acme's office") - matches capitalized word + 's before common nouns
        POSSESSIVE_COMPANY = /
          (?<![A-Za-z0-9])
          ([A-Z][A-Za-z0-9&.]+)'s
          \s+(?:office|meeting|location|facility|building|headquarters|premises|site|venue|team|staff|employees|department|division|unit|group|company|firm|organization)
        /ix

        # More general possessive pattern - capitalized word + 's followed by lowercase word or punctuation
        # This catches cases like "Acme's office" or "Acme's," even when not in dictionary
        GENERAL_POSSESSIVE = /
          (?<![A-Za-z0-9])
          ([A-Z][A-Za-z0-9&.]+)'s
          (?=\s+[a-z]|,|\.|$)
        /ix
  
        def self.call(text)
          spans = []

          # Detect title + single last name (e.g. "Mr. Henderson", "Dr. Wong")
          text.to_enum(:scan, TITLE_LASTNAME).each do
            m = Regexp.last_match
            spans << {
              start: m.begin(0),
              end: m.end(0),
              type: :name,
              value: m[0],
              confidence: 0.55
            }
          end

          # Greeting line: "Hi Maria Santos," / "Hello FirstName LastName,"
          text.to_enum(:scan, GREETING_NAME).each do
            m = Regexp.last_match
            spans << {
              start: m.begin(1),
              end: m.end(1),
              type: :name,
              value: m[1],
              confidence: 0.55
            }
          end

          # Signature line: "Thanks,\nDavid Chen"
          text.to_enum(:scan, SIGNATURE_NAME).each do
            m = Regexp.last_match
            spans << {
              start: m.begin(1),
              end: m.end(1),
              type: :name,
              value: m[1],
              confidence: 0.55
            }
          end

          # Detect person names (First Last) and extend if company suffix follows
          text.to_enum(:scan, PERSON_NAME).each do
            m = Regexp.last_match
            start_pos = m.begin(0)
            end_pos = m.end(0)
            
            # Check if company suffix follows immediately after
            suffix_match = text[end_pos..(end_pos + 50)]&.match(/\A\s*#{COMPANY_SUFFIX}/)
            if suffix_match
              end_pos = end_pos + suffix_match.end(0)
            end
            
            spans << {
              start: start_pos,
              end: end_pos,
              type: :name,
              value: text[start_pos...end_pos],
              confidence: 0.55
            }
          end

          # Detect company names with suffixes
          text.to_enum(:scan, COMPANY_NAME).each do
            m = Regexp.last_match
            spans << {
              start: m.begin(0),
              end: m.end(0),
              type: :name,
              value: m[0],
              confidence: 0.65
            }
          end

          # Detect standalone first names in name-like contexts
          text.to_enum(:scan, STANDALONE_NAME).each do
            m = Regexp.last_match
            # Only capture the name part, not the verb
            spans << {
              start: m.begin(1),
              end: m.end(1),
              type: :name,
              value: m[1],
              confidence: 0.45
            }
          end

          # Detect possessive company names (specific context like "Acme's office")
          text.to_enum(:scan, POSSESSIVE_COMPANY).each do
            m = Regexp.last_match
            # Capture the company name including the possessive 's (group 1 is the name, +2 for "'s")
            name_start = m.begin(1)
            name_end = m.end(1) + 2  # end of group 1 + "'s"
            spans << {
              start: name_start,
              end: name_end,
              type: :name,
              value: text[name_start...name_end],
              confidence: 0.50
            }
          end

          # Detect general possessive forms (broader pattern, lower confidence)
          # This catches cases like "Acme's" even when not followed by specific words
          text.to_enum(:scan, GENERAL_POSSESSIVE).each do
            m = Regexp.last_match
            name_start = m.begin(1)
            name_end = m.end(1) + 2  # end of group 1 + "'s"
            
            # Check if this span overlaps with any existing span (avoid duplicates)
            overlap = spans.any? { |s| name_start < s[:end] && s[:start] < name_end }
            unless overlap
              spans << {
                start: name_start,
                end: name_end,
                type: :name,
                value: text[name_start...name_end],
                confidence: 0.40
              }
            end
          end

          spans
        end
      end
    end
  end
  