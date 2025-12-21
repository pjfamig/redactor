class RedactionsController < ApplicationController
  protect_from_forgery with: :exception

  def new
  end

  def create
    text = params.require(:text).to_s
    dictionary = Array(params[:dictionary]).map(&:to_s).reject(&:blank?)

    result = Redaction::Pipeline.new(text, dictionary: dictionary).call

    # For a copy/paste tool, mapping is often unnecessary to return to the browser.
    render json: {
      redacted_text: result[:redacted_text],
      spans: result[:spans]
    }
  end
end
