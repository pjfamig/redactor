Rails.application.routes.draw do
  get "redactions/new"
  get "redactions/create"
  get "up" => "rails/health#show", as: :rails_health_check
  
  resource :redactions, only: [:new, :create]
  root "redactions#new"
end
