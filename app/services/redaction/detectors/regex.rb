# app/services/redaction/detectors/regex.rb
module Redaction
    module Detectors
      class Regex
        EMAIL = /\b[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}\b/i
        URL   = %r{\bhttps?://[^\s<]+|\bwww\.[^\s<]+}i
        IPV4  = /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d?\d)\b/
        SSN   = /\b\d{3}-\d{2}-\d{4}\b/
        PHONE = /
          (?<!\w)
          (?:\+?1[\s\-\.]?)?
          (?:\(?\d{3}\)?[\s\-\.]?)\d{3}[\s\-\.]?\d{4}
          (?!\w)
        /x
  
        # very naive; keep as “maybe address”
        ADDRESS = /\b\d{1,6}\s+[A-Za-z0-9.\-]+\s+(?:St|Street|Ave|Avenue|Blvd|Boulevard|Rd|Road|Ln|Lane|Dr|Drive|Ct|Court)\b/i
  
        CC_CANDIDATE = /\b(?:\d[ -]*?){13,19}\b/
  
        def self.call(text)
          spans = []
          spans += scan(text, EMAIL, :email)
          spans += scan(text, PHONE, :phone)
          spans += scan(text, URL,   :url)
          spans += scan(text, IPV4,  :ip)
          spans += scan(text, SSN,   :ssn)
          spans += scan(text, ADDRESS, :address)
          spans += scan_credit_cards(text)
          spans
        end
  
        def self.scan(text, regex, type)
          text.to_enum(:scan, regex).map do
            m = Regexp.last_match
            { start: m.begin(0), end: m.end(0), type: type, value: m[0], confidence: 0.95 }
          end
        end
  
        def self.scan_credit_cards(text)
          spans = scan(text, CC_CANDIDATE, :credit_card)
          spans.select { |s| luhn_valid?(s[:value]) }
               .map { |s| s.merge(confidence: 0.99) }
        end
  
        def self.luhn_valid?(raw)
          digits = raw.gsub(/\D/, "")
          return false if digits.length < 13 || digits.length > 19
          sum = 0
          digits.reverse.chars.each_with_index do |ch, idx|
            n = ch.ord - 48
            if idx.odd?
              n *= 2
              n -= 9 if n > 9
            end
            sum += n
          end
          (sum % 10).zero?
        end
      end
    end
  end
  