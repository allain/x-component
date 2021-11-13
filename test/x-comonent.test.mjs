import { expect } from '@esm-bundle/chai/esm/chai.js'
import xComponent from '../src/x-component.mjs'
import Alpine from 'alpinejs'

const waitUntil = (predicate, timeout = 10000) =>
  new Promise((resolve, reject) => {
    setTimeout(() => reject(new Error('timeout')), timeout)
    const waitId = setInterval(() => {
      const result = predicate()

      if (result) {
        clearInterval(waitId)
        resolve(result)
      }
    }, 1)
  })

const waitForEl = (selector) =>
  waitUntil(() => document.querySelector(selector))

// so html gets formatted in literals in vscode
const html = String.raw

before(() => {
  document.body.setAttribute('x-data', '')
  Alpine.plugin(xComponent)

  window.Alpine = Alpine
  Alpine.start()
})

beforeEach(() => (document.body.innerHTML = ''))

it('works in basic case', async () => {
  document.body.innerHTML = `
	<template x-component="x-test1">
	   <div class="inner">Hello World</div>
	</template>

	<x-test1></x-test1>
  `

  const innerEl = await waitForEl('.inner')

  expect(innerEl.parentElement.tagName).to.equal('X-TEST1')
})

it('supports default slot', async () => {
  document.body.innerHTML = html`
    <template x-component="x-test2">
      <div class="inner">
        <slot></slot>
      </div>
    </template>

    <x-test2 id="text">
      <template>Hello World</template>
    </x-test2>

    <x-test2 id="html">
      <template><div>Hello World</div></template>
    </x-test2>

    <x-test2 id="html2">
      <template
        ><div>Hello</div>
        <div>World</div></template
      >
    </x-test2>

    <x-test2 id="named">
      <template slot="default"><div>Hello World</div></template>
    </x-test2>
  `

  // text
  {
    const innerEl = await waitForEl('#text .inner')
    expect(innerEl.innerHTML.trim()).to.equal('Hello World')
  }

  // single html element
  {
    const innerEl = await waitForEl('#html .inner')
    expect(innerEl.innerHTML.trim()).to.equal('<div>Hello World</div>')
  }

  // many html elements
  {
    const innerEl = await waitForEl('#html2 .inner')
    expect(innerEl.querySelectorAll('div')).to.have.length(2)
  }

  // with named default slot
  {
    const innerEl = await waitForEl('#named .inner')
    expect(innerEl.innerHTML.trim()).to.equal('<div>Hello World</div>')
  }
})

it('supports named slots', async () => {
  document.body.innerHTML = html`
    <template x-component="x-test3">
      <div class="inner">
        <div class="header">
          <slot name="header">Default Header</slot>
        </div>
        <div class="default">
          <slot></slot>
        </div>
        <span
          class="inspection"
          x-text="JSON.stringify({header: $slots.header, default: $slots.default})"
        ></span>
      </div>
    </template>

    <x-test3 id="text">
      <template slot="header">Header</template>
      <template>Default</template>
    </x-test3>

    <x-test3 id="html">
      <template slot="header"
        ><div>Header</div>
        <div>Header</div></template
      >
      <template><div>Default</div></template>
    </x-test3>

    <x-test3 id="duplicates">
      <template slot="header"><div>Header 1</div></template>
      <template slot="header"><div>Header 2</div></template>
    </x-test3>

    <x-test3 id="defaults"></x-test3>
    <x-test3 id="inspection">
      <template slot="header">Header</template>
    </x-test3>
  `

  // text
  {
    const headerEl = await waitForEl('#text .header')
    expect(headerEl.innerHTML.trim()).to.equal('Header')

    const defaultEl = await waitForEl('#text .default')
    expect(defaultEl.innerHTML.trim()).to.equal('Default')
  }

  // html elements
  {
    const headerEl = await waitForEl('#html .header')
    expect(headerEl.querySelectorAll('div')).to.have.length(2)

    const defaultEl = await waitForEl('#html .default')
    expect(defaultEl.innerHTML.trim()).to.equal('<div>Default</div>')
  }

  // duplicate slots get merged
  {
    const headerEl = await waitForEl('#duplicates .header')
    expect(headerEl.querySelectorAll('div')).to.have.length(2)
    expect(headerEl.innerText).to.match(/^\s*Header 1\s*Header 2\s*$/)
  }

  // uses default if not given
  {
    const headerEl = await waitForEl('#defaults .header')
    expect(headerEl.innerText).to.equal('Default Header')
  }

  // can inspect if slot given
  {
    const inspectEl = await waitForEl('#inspection .inspection')
    expect(inspectEl.innerText).to.equal('{"header":true}')
  }
})

it('sees external scopes', async () => {
  document.body.innerHTML = html`
    <template x-component="x-test4">
      <div class="inner" x-text="foo"></div>
    </template>

    <div x-data="{foo: 'bar'}">
      <x-test4></x-test4>
    </div>
  `

  const innerEl = await waitForEl('.inner')
  expect(Alpine.evaluate(innerEl, 'foo')).to.equal('bar')
  expect(innerEl.innerText).to.equal('bar')
})

it('adds bound attributes to the component scope', async () => {
  document.body.innerHTML = html`
    <template x-component="x-test5">
      <div class="inner" x-text="foo"></div>
    </template>

    <x-test5 :foo="'bar'"></x-test5>
  `

  const innerEl = await waitForEl('.inner')
  expect(Alpine.evaluate(innerEl, 'foo')).to.equal('bar')
  expect(innerEl.innerText).to.equal('bar')
})

it('passes through bound attributes as non-strings', async () => {
  document.body.innerHTML = html`
    <template x-component="x-test6">
      <div class="inner" x-text="Array.isArray(items)"></div>
    </template>

    <x-test6 :items="[1,2,3]"></x-test6>
  `
  const innerEl = await waitForEl('.inner')

  expect(innerEl.innerText).to.equal('true')
})

it('sees changes to bound attributes', async () => {
  document.body.innerHTML = html`
    <template x-component="x-test7">
      <div class="inner" x-text="bar"></div>
    </template>

    <div x-data="{foo: 'foo'}">
      <x-test7 :bar="foo"></x-test6>
    </div>
  `
  const innerEl = await waitForEl('.inner')
  expect(innerEl.innerText).to.equal('foo')
  Alpine.evaluate(innerEl, 'foo="changed"')
  // wait for change to propagate
  await new Promise((r) => setTimeout(r, 1))
  expect(innerEl.innerText).to.equal('changed')
})
