# app/services/redaction/pipeline.rb
module Redaction
  class Pipeline
    PRIORITY = {
      credit_card: 100,
      ssn: 90,
      email: 80,
      phone: 70,
      ip: 60,
      url: 50,
      address: 40,
      custom: 30,
      date: 20,
      name: 10
    }.freeze

    def initialize(text, dictionary: [])
      @text = text.to_s
      @dictionary = dictionary.map(&:to_s).reject(&:blank?)
    end

    def call
      spans = []
      spans += Detectors::Regex.call(@text)
      spans += Detectors::Dictionary.call(@text, @dictionary) if @dictionary.any?
      spans += Detectors::Names.call(@text)

      spans = SpanTools.merge_and_resolve(@text, spans, PRIORITY)
      mapping, redacted = Replacer.apply(@text, spans)

      {
        original_text: @text,
        redacted_text: redacted,
        spans: spans,
        mapping: mapping
      }
    end
  end
end