
import sinon from 'sinon';

import URI from 'urijs';
import {
  buildV1ChartDataPayload,
  getExploreUrl,
  getExploreLongUrl,
  shouldUseLegacyApi,
  getSimpleSQLExpression,
} from 'src/explore/exploreUtils';
import { DashboardStandaloneMode } from 'src/dashboard/util/constants';
import * as hostNamesConfig from 'src/utils/hostNamesConfig';
import { getChartMetadataRegistry } from '@rabbitai-ui/core';

describe('exploreUtils', () => {
  const { location } = window;
  const formData = {
    datasource: '1__table',
  };
  const sFormData = JSON.stringify(formData);
  function compareURI(uri1, uri2) {
    expect(uri1.toString()).toBe(uri2.toString());
  }

  describe('getExploreUrl', () => {
    it('generates proper base url', () => {
      // This assertion is to show clearly the value of location.href
      // in the context of unit tests.
      expect(location.href).toBe('http://localhost/');

      const url = getExploreUrl({
        formData,
        endpointType: 'base',
        force: false,
        curUrl: 'http://rabbitai.com',
      });
      compareURI(URI(url), URI('/rabbitai/explore/'));
    });
    it('generates proper json url', () => {
      const url = getExploreUrl({
        formData,
        endpointType: 'json',
        force: false,
        curUrl: 'http://rabbitai.com',
      });
      compareURI(URI(url), URI('/rabbitai/explore_json/'));
    });
    it('generates proper json forced url', () => {
      const url = getExploreUrl({
        formData,
        endpointType: 'json',
        force: true,
        curUrl: 'rabbitai.com',
      });
      compareURI(
        URI(url),
        URI('/rabbitai/explore_json/').search({ force: 'true' }),
      );
    });
    it('generates proper csv URL', () => {
      const url = getExploreUrl({
        formData,
        endpointType: 'csv',
        force: false,
        curUrl: 'rabbitai.com',
      });
      compareURI(
        URI(url),
        URI('/rabbitai/explore_json/').search({ csv: 'true' }),
      );
    });
    it('generates proper standalone URL', () => {
      const url = getExploreUrl({
        formData,
        endpointType: 'standalone',
        force: false,
        curUrl: 'rabbitai.com',
      });
      compareURI(
        URI(url),
        URI('/rabbitai/explore/').search({
          standalone: DashboardStandaloneMode.HIDE_NAV,
        }),
      );
    });
    it('preserves main URLs params', () => {
      const url = getExploreUrl({
        formData,
        endpointType: 'json',
        force: false,
        curUrl: 'rabbitai.com?foo=bar',
      });
      compareURI(
        URI(url),
        URI('/rabbitai/explore_json/').search({ foo: 'bar' }),
      );
    });
    it('generate proper save slice url', () => {
      const url = getExploreUrl({
        formData,
        endpointType: 'json',
        force: false,
        curUrl: 'rabbitai.com?foo=bar',
      });
      compareURI(
        URI(url),
        URI('/rabbitai/explore_json/').search({ foo: 'bar' }),
      );
    });
  });

  describe('domain sharding', () => {
    let stub;
    const availableDomains = [
      'http://localhost/',
      'domain1.com',
      'domain2.com',
      'domain3.com',
    ];
    beforeEach(() => {
      stub = sinon
        .stub(hostNamesConfig, 'availableDomains')
        .value(availableDomains);
    });
    afterEach(() => {
      stub.restore();
    });

    it('generate url to different domains', () => {
      let url = getExploreUrl({
        formData,
        endpointType: 'json',
        allowDomainSharding: true,
      });
      // skip main domain for fetching chart if domain sharding is enabled
      // to leave main domain free for other calls like fav star, save change, etc.
      expect(url).toMatch(availableDomains[1]);

      url = getExploreUrl({
        formData,
        endpointType: 'json',
        allowDomainSharding: true,
      });
      expect(url).toMatch(availableDomains[2]);

      url = getExploreUrl({
        formData,
        endpointType: 'json',
        allowDomainSharding: true,
      });
      expect(url).toMatch(availableDomains[3]);

      // circle back to first available domain
      url = getExploreUrl({
        formData,
        endpointType: 'json',
        allowDomainSharding: true,
      });
      expect(url).toMatch(availableDomains[1]);
    });
    it('not generate url to different domains without flag', () => {
      let csvURL = getExploreUrl({
        formData,
        endpointType: 'csv',
      });
      expect(csvURL).toMatch(availableDomains[0]);

      csvURL = getExploreUrl({
        formData,
        endpointType: 'csv',
      });
      expect(csvURL).toMatch(availableDomains[0]);
    });
  });

  describe('getExploreLongUrl', () => {
    it('generates proper base url with form_data', () => {
      compareURI(
        URI(getExploreLongUrl(formData, 'base')),
        URI('/rabbitai/explore/').search({ form_data: sFormData }),
      );
    });

    it('generates url with standalone', () => {
      compareURI(
        URI(getExploreLongUrl(formData, 'standalone')),
        URI('/rabbitai/explore/').search({
          form_data: sFormData,
          standalone: DashboardStandaloneMode.HIDE_NAV,
        }),
      );
    });
  });

  describe('buildV1ChartDataPayload', () => {
    it('generate valid request payload despite no registered buildQuery', () => {
      const v1RequestPayload = buildV1ChartDataPayload({
        formData: { ...formData, viz_type: 'my_custom_viz' },
      });
      expect(v1RequestPayload).hasOwnProperty('queries');
    });
  });

  describe('shouldUseLegacyApi', () => {
    beforeAll(() => {
      getChartMetadataRegistry()
        .registerValue('my_legacy_viz', { useLegacyApi: true })
        .registerValue('my_v1_viz', { useLegacyApi: false });
    });

    afterAll(() => {
      getChartMetadataRegistry().remove('my_legacy_viz').remove('my_v1_viz');
    });

    it('returns true for legacy viz', () => {
      const useLegacyApi = shouldUseLegacyApi({
        ...formData,
        viz_type: 'my_legacy_viz',
      });
      expect(useLegacyApi).toBe(true);
    });

    it('returns false for v1 viz', () => {
      const useLegacyApi = shouldUseLegacyApi({
        ...formData,
        viz_type: 'my_v1_viz',
      });
      expect(useLegacyApi).toBe(false);
    });

    it('returns false for formData with unregistered viz_type', () => {
      const useLegacyApi = shouldUseLegacyApi({
        ...formData,
        viz_type: 'undefined_viz',
      });
      expect(useLegacyApi).toBe(false);
    });

    it('returns false for formData without viz_type', () => {
      const useLegacyApi = shouldUseLegacyApi(formData);
      expect(useLegacyApi).toBe(false);
    });
  });

  describe('getSimpleSQLExpression', () => {
    it('returns empty string when subject is undefined', () => {
      expect(getSimpleSQLExpression(undefined, '=', 10)).toBe('');
      expect(getSimpleSQLExpression()).toBe('');
    });
    it("returns subject when it's provided and operator is undefined", () => {
      expect(getSimpleSQLExpression('col', undefined, 10)).toBe('col');
      expect(getSimpleSQLExpression('col')).toBe('col');
    });
    it("returns subject and operator when they're provided and comparator is undefined", () => {
      expect(getSimpleSQLExpression('col', '=')).toBe('col =');
      expect(getSimpleSQLExpression('col', 'IN')).toBe('col IN');
      expect(getSimpleSQLExpression('col', 'IN', [])).toBe('col IN');
    });
    it('returns full expression when subject, operator and comparator are provided', () => {
      expect(getSimpleSQLExpression('col', '=', 'comp')).toBe("col = 'comp'");
      expect(getSimpleSQLExpression('col', '=', "it's an apostrophe")).toBe(
        "col = 'it''s an apostrophe'",
      );
      expect(getSimpleSQLExpression('col', '=', 0)).toBe('col = 0');
      expect(getSimpleSQLExpression('col', '=', '0')).toBe('col = 0');
      expect(getSimpleSQLExpression('col', 'IN', 'foo')).toBe("col IN ('foo')");
      expect(getSimpleSQLExpression('col', 'NOT IN', ['foo'])).toBe(
        "col NOT IN ('foo')",
      );
      expect(getSimpleSQLExpression('col', 'IN', ['foo', 'bar'])).toBe(
        "col IN ('foo', 'bar')",
      );
      expect(getSimpleSQLExpression('col', 'IN', ['0', '1', '2'])).toBe(
        'col IN (0, 1, 2)',
      );
      expect(getSimpleSQLExpression('col', 'NOT IN', [0, 1, 2])).toBe(
        'col NOT IN (0, 1, 2)',
      );
    });
  });
});
