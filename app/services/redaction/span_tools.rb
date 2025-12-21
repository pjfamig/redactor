# app/services/redaction/span_tools.rb
module Redaction
    class SpanTools
      def self.merge_and_resolve(_text, spans, priority_map)
        spans = spans.sort_by { |s| [s[:start], -(s[:end] - s[:start]), -priority_map.fetch(s[:type], 0)] }
        kept = []
  
        spans.each do |s|
          overlap = kept.find { |k| s[:start] < k[:end] && k[:start] < s[:end] }
          if overlap.nil?
            kept << s
          else
            s_pri = priority_map.fetch(s[:type], 0)
            k_pri = priority_map.fetch(overlap[:type], 0)
            # replace if higher priority (or longer if tied)
            if (s_pri > k_pri) || (s_pri == k_pri && (s[:end]-s[:start]) > (overlap[:end]-overlap[:start]))
              kept.delete(overlap)
              kept << s
            end
          end
        end
  
        kept.sort_by { |s| s[:start] }
      end
    end
  end
  