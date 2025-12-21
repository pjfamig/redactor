require "test_helper"

class RedactionsControllerTest < ActionDispatch::IntegrationTest
  test "should get new" do
    get redactions_new_url
    assert_response :success
  end

  test "should get create" do
    get redactions_create_url
    assert_response :success
  end
end
