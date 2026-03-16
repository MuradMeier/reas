import pytest
from django.conf import settings
import requests
from agency.utils import geocode_address, generate_description_with_gpt


class TestGeocodeAddress:
    def test_success(self, mocker):
        mock_get = mocker.patch('requests.get')
        mock_response = mocker.Mock()
        mock_response.json.return_value = {
            'response': {
                'GeoObjectCollection': {
                    'featureMember': [{
                        'GeoObject': {
                            'Point': {
                                'pos': '37.62 55.76'
                            }
                        }
                    }]
                }
            }
        }
        mock_response.raise_for_status = mocker.Mock()
        mock_get.return_value = mock_response

        result = geocode_address('Москва, Кремль')
        assert result == {'lat': 55.76, 'lon': 37.62}

    def test_failure(self, mocker):
        mock_get = mocker.patch('requests.get', side_effect=requests.exceptions.RequestException('Network error'))
        result = geocode_address('Москва')
        assert result is None


class TestGenerateDescriptionWithGPT:
    def test_success(self, mocker):
        mock_post = mocker.patch('requests.post')
        mock_response = mocker.Mock()
        mock_response.json.return_value = {
            'result': {
                'alternatives': [{
                    'message': {
                        'text': 'Прекрасная квартира'
                    }
                }]
            }
        }
        mock_response.raise_for_status = mocker.Mock()
        mock_post.return_value = mock_response

        result = generate_description_with_gpt('prompt')
        assert result == 'Прекрасная квартира'

    def test_failure(self, mocker):
        mock_post = mocker.patch('requests.post', side_effect=Exception('API error'))
        result = generate_description_with_gpt('prompt')
        assert result is None