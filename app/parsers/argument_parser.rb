require 'chronic'

class ArgumentParser
  def self.parse(args)
    mob = ""
    manual_tod = ""

    # look for time
    arguments = args.dup.to_s
    
    dates = Chronic.parse(arguments)

    mob, manual_tod = arguments.split(/[\|\,]/)

    if manual_tod == nil || dates.size > 0
      matches = arguments.to_s.downcase.match(/(.*?)(\||\s)+(-\d{,3})?([0-9]|jan |january |feb |february |mar |march |apr |april |may |jun |june |jul |july |aug |august |sep |september |oct |october |nov |november |dec |december )(.*?)$/)
      if matches
        mob = matches[1]

        if matches[3]
          manual_tod = matches[3..-1].compact.join
        elsif matches[1] && matches[4]
          manual_tod = [matches[4], matches[5]].compact.join
        end
      end
    end

    mob.strip!
    mob.gsub!("`", "'")

    manual_tod.strip! if manual_tod

    return mob, manual_tod
  end
end
